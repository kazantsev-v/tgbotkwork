const axios = require('axios');
const https = require('https');
const { config } = require('../config/config');

// Настройка времени ожидания для всех запросов
const TIMEOUT = parseInt(process.env.HTTP_TIMEOUT) || 30000; // 30 секунд по умолчанию
const MAX_RETRIES = 3; // Максимальное количество повторных попыток
const RETRY_DELAY = 1000; // Задержка между повторными попытками (1 секунда)

// Получаем базовый URL из конфигурации
const BASE_URL = config.backendURL;

// Создаем экземпляр axios с общими настройками
const api = axios.create({
    baseURL: BASE_URL,
    timeout: TIMEOUT,
    // Игнорируем проблемы с SSL (только для разработки)
    httpsAgent: new https.Agent({
        rejectUnauthorized: false
    }),
    headers: {
        'Content-Type': 'application/json'
    }
});

// Функция задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Безопасный метод для работы с URL
function safeJoinUrl(base, endpoint) {
    try {
        if (!base) {
            console.error('Базовый URL не установлен');
            return endpoint;
        }
        
        // Убираем / в конце базового URL
        const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
        
        // Добавляем / в начало endpoint, если его нет
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
        
        return cleanBase + cleanEndpoint;
    } catch (error) {
        console.error(`Ошибка при формировании URL: ${error.message}`);
        return base + '/' + endpoint;
    }
}

// Обертка для выполнения запросов с повторными попытками и обработкой ошибок
async function callApi(method, url, data = null, options = {}) {
    const { retries = MAX_RETRIES, retryDelay = RETRY_DELAY } = options;
    let lastError;

    // Пробуем сформировать полный URL для логирования
    const fullUrl = safeJoinUrl(BASE_URL, url);
    console.log(`Выполняется запрос: ${method.toUpperCase()} ${fullUrl}`);

    for (let attempt = 0; attempt < retries + 1; attempt++) {
        try {
            // Для GET запросов data передается как params
            const config = method.toLowerCase() === 'get' && data
                ? { params: data }
                : { data };
                
            const response = await api({
                method,
                url,
                ...config,
                ...options
            });

            return response.data;
        } catch (error) {
            lastError = error;
            
            // Проверяем, есть ли у ошибки свойство config для доступа к данным запроса
            const errorConfig = error.config || {};
            
            // Подробное логирование ошибки
            console.error(`API ошибка (попытка ${attempt + 1}/${retries + 1}) для ${method} ${url}:`, {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: error.response?.data,
                config: {
                    url: errorConfig.url,
                    method: errorConfig.method,
                    data: errorConfig.data,
                    headers: errorConfig.headers
                }
            });

            // Если ошибка связана с недопустимым URL, перехватываем ее
            if (error.message && error.message.includes('Invalid URL') || error.code === 'ERR_INVALID_URL') {
                console.error(`Недопустимый URL: ${fullUrl}. Проверьте настройки URL в config или переменные окружения.`);
                throw new Error(`Недопустимый URL при запросе к ${url}. Проверьте настройки конфигурации API.`);
            }

            // Если это не последняя попытка, и ошибка подходит для повторной попытки
            if (attempt < retries && shouldRetry(error)) {
                console.log(`Повторная попытка через ${retryDelay}мс...`);
                await delay(retryDelay);
                continue;
            }

            // Преобразуем ошибку в удобный формат перед выбросом
            throw formatError(error);
        }
    }

    throw lastError; // Никогда не должно произойти, но на всякий случай
}

// Функция определяет, следует ли повторить запрос
function shouldRetry(error) {
    // Повторяем запрос при сетевых ошибках или ошибках сервера (5xx)
    return (
        !error.response || // Нет ответа (сетевая ошибка)
        error.code === 'ECONNABORTED' || // Таймаут
        error.code === 'ETIMEDOUT' || // Таймаут
        error.code === 'ECONNREFUSED' || // Сервер недоступен
        (error.response && error.response.status >= 500) // Ошибка сервера
    );
}

// Форматирование ошибки в единый формат
function formatError(error) {
    const formattedError = new Error(
        error.response?.data?.message || error.message || 'Неизвестная ошибка API'
    );
    
    formattedError.originalError = error;
    formattedError.status = error.response?.status;
    formattedError.data = error.response?.data;
    formattedError.isNetworkError = !error.response;
    formattedError.isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    
    return formattedError;
}

// Экспортируем методы для работы с API
module.exports = {
    // Общий метод для запросов
    request: callApi,
    
    // Удобные обертки для разных HTTP методов
    get: (url, params, options) => callApi('get', url, params, options),
    post: (url, data, options) => callApi('post', url, data, options),
    put: (url, data, options) => callApi('put', url, data, options),
    patch: (url, data, options) => callApi('patch', url, data, options),
    delete: (url, options) => callApi('delete', url, null, options),
    
    // Методы для работы с пользователями
    users: {
        getProfile: (telegramId) => callApi('get', `/users/${telegramId}`),
        updateProfile: (telegramId, data) => callApi('put', `/users/${telegramId}`, data),
        createProfile: (data) => callApi('post', '/users', data)
    },
    
    // Методы для работы с заказами
    orders: {
        getAll: (params) => callApi('get', '/orders', params),
        getById: (id) => callApi('get', `/orders/${id}`),
        create: (data) => callApi('post', '/orders', data),
        update: (id, data) => callApi('put', `/orders/${id}`, data)
    }
};
