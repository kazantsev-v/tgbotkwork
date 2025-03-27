const logger = require('./logger');
const axios = require('axios');

// Улучшенная функция для обработки ошибок Axios с детальным логированием
const catchAxiosError = (error, context = 'Axios request') => {
    if (axios.isAxiosError(error)) {
        if (error.response) {
            // Ошибка с ответом от сервера (4xx, 5xx)
            logger.error(`${context} failed with status ${error.response.status}`, {
                status: error.response.status,
                data: error.response.data,
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
            });
        } else if (error.request) {
            // Запрос был сделан, но ответ не получен
            logger.error(`${context} timed out or server did not respond`, {
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
                timeout: error.config?.timeout,
            });
        } else {
            // Ошибка при настройке запроса
            logger.error(`${context} failed before sending`, {
                error: error.message,
                stack: error.stack,
            });
        }
    } else {
        // Не Axios ошибка
        logger.error(`${context} failed with non-Axios error`, {
            error: error.message,
            stack: error.stack,
        });
    }
    return null; // Возвращаем null для единообразия
};

// Обертка для безопасного выполнения функций с автоматической обработкой ошибок
const safeExecute = async (func, params = [], context = 'Function execution') => {
    try {
        return await func(...params);
    } catch (error) {
        logger.error(`Error in ${context}`, { error });
        return null;
    }
};

// Функция для повторных попыток выполнения с экспоненциальной задержкой
const retry = async (func, params = [], options = {}) => {
    const { 
        maxRetries = 3, 
        initialDelay = 1000, 
        maxDelay = 10000, 
        backoffFactor = 2,
        context = 'retry operation'
    } = options;
    
    let attempt = 1;
    let delay = initialDelay;
    
    while (attempt <= maxRetries) {
        try {
            return await func(...params);
        } catch (error) {
            if (attempt === maxRetries) {
                logger.error(`All ${maxRetries} retry attempts failed in ${context}`, { error });
                throw error; // Если все попытки исчерпаны, пробрасываем ошибку дальше
            }
            
            // Рассчитываем задержку для следующей попытки
            delay = Math.min(delay * backoffFactor, maxDelay);
            
            logger.warn(`Attempt ${attempt}/${maxRetries} failed in ${context}, retrying in ${delay}ms`, {
                error: error.message,
                attempt
            });
            
            await new Promise(resolve => setTimeout(resolve, delay));
            attempt++;
        }
    }
};

module.exports = {
    catchAxiosError,
    safeExecute,
    retry
};
