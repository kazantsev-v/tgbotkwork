const axios = require('axios');
const https = require('https');
const { config } = require('../config/config');

// Настройка времени ожидания для всех запросов
const TIMEOUT = parseInt(process.env.HTTP_TIMEOUT) || 30000; // 30 секунд по умолчанию
const MAX_RETRIES = 3; // Максимальное количество повторных попыток
const RETRY_DELAY = 1000; // Задержка между повторными попытками (1 секунда)

// Создаем экземпляр axios с общими настройками
const api = axios.create({
    baseURL: config.backendURL,
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

// Функция для добавления префикса /api к эндпоинтам
function getApiUrl(endpoint) {
    if (!endpoint) return '/api';
    
    // Убедимся, что эндпоинт начинается с /, но не содержит /api
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `/api${cleanEndpoint}`;
}

// Обертка для выполнения запросов с повторными попытками и обработкой ошибок
async function callApi(method, url, data = null, options = {}) {
    const { retries = MAX_RETRIES, retryDelay = RETRY_DELAY } = options;
    let lastError;
    
    // Добавляем /api к URL, если его нет
    const apiUrl = getApiUrl(url);
    
    console.log(`Выполнение ${method.toUpperCase()} запроса к ${apiUrl}`);

    for (let attempt = 0; attempt < retries + 1; attempt++) {
        try {
            // Для GET запросов data передается как params
            const config = method.toLowerCase() === 'get' && data
                ? { params: data }
                : { data };
                
            const response = await api({
                method,
                url: apiUrl,
                ...config,
                ...options
            });

            return response.data;
        } catch (error) {
            lastError = error;
            
            // Проверяем, получили ли мы HTML вместо JSON (что означает проблему с API)
            const isHtmlResponse = error.response?.data && 
                typeof error.response.data === 'string' && 
                error.response.data.includes('<!DOCTYPE html>');
            
            // Формируем сообщение об ошибке с полной информацией о запросе
            const requestUrl = `${config.backendURL}${apiUrl}`;
            
            // Подробное логирование ошибки
            console.error(`API ошибка (попытка ${attempt + 1}/${retries + 1}) для ${method} ${url}:`, {
                message: error.message,
                code: error.code,
                status: error.response?.status,
                data: isHtmlResponse ? 'HTML response received instead of JSON' : error.response?.data,
                config: {
                    url: error.config?.url,
                    method: error.config?.method,
                    data: error.config?.data,
                    headers: error.config?.headers
                },
                fullUrl: requestUrl
            });

            // Если это не последняя попытка, и ошибка подходит для повторной попытки
            if (attempt < retries && shouldRetry(error)) {
                console.log(`Повторная попытка через ${retryDelay}мс...`);
                await delay(retryDelay);
                continue;
            }

            // Преобразуем ошибку в удобный формат перед выбросом
            throw formatError(error, requestUrl);
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

// Улучшенное форматирование ошибки
function formatError(error, requestUrl) {
    // Определяем понятный текст ошибки в зависимости от статуса
    let message = error.message;
    
    if (error.response) {
        const status = error.response.status;
        
        if (status === 404) {
            message = `Ресурс не найден: ${requestUrl}`;
        } else if (status === 401 || status === 403) {
            message = 'Ошибка авторизации при обращении к API';
        } else if (status >= 500) {
            message = 'Ошибка сервера API. Пожалуйста, попробуйте позже';
        }
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
        message = 'Таймаут запроса к API. Сервер недоступен или перегружен';
    } else if (error.code === 'ECONNREFUSED') {
        message = 'Не удалось подключиться к серверу API. Сервер недоступен';
    }
    
    const formattedError = new Error(message);
    
    formattedError.originalError = error;
    formattedError.status = error.response?.status;
    formattedError.data = error.response?.data;
    formattedError.isNetworkError = !error.response;
    formattedError.isTimeout = error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT';
    formattedError.requestUrl = requestUrl;
    
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
        updateScene: (telegramId, scene, step) => callApi('patch', `/users/${telegramId}/scene`, { scene, step }),
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
