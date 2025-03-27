const fs = require('fs');
const path = require('path');

// Создаем директорию для логов, если она не существует
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Форматирование даты без зависимости от date-fns
const formatDate = (date) => {
    const pad = (num) => (num < 10 ? '0' + num : num);
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    
    return `${year}-${month}-${day}`;
};

const formatDateTime = (date) => {
    const dateStr = formatDate(date);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    
    return `${dateStr} ${hours}:${minutes}:${seconds}`;
};

// Получаем текущую дату для имени файла
const getCurrentDate = () => formatDate(new Date());
const getCurrentDateTime = () => formatDateTime(new Date());

// Функция для записи лога в файл
const writeToLogFile = (level, message, details = {}) => {
    const logEntry = {
        timestamp: getCurrentDateTime(),
        level,
        message,
        ...details
    };
    
    const logFileName = `${getCurrentDate()}.log`;
    const logFilePath = path.join(logsDir, logFileName);
    
    const logString = `[${logEntry.timestamp}] [${level.toUpperCase()}] ${message} ${Object.keys(details).length ? JSON.stringify(details) : ''}\n`;
    
    try {
        fs.appendFileSync(logFilePath, logString);
    } catch (err) {
        console.error(`Failed to write to log file: ${err.message}`);
    }
    
    // Вывод в консоль для отладки
    console[level !== 'error' ? 'log' : 'error'](logString);
}

// Логгер с методами для разных уровней логирования
const logger = {
    debug: (message, details = {}) => {
        writeToLogFile('debug', message, details);
    },
    
    info: (message, details = {}) => {
        writeToLogFile('info', message, details);
    },
    
    warn: (message, details = {}) => {
        writeToLogFile('warn', message, details);
    },
    
    error: (message, details = {}) => {
        // Если details содержит ошибку, извлекаем из нее стек и сообщение
        if (details.error instanceof Error) {
            details.errorMessage = details.error.message;
            details.stack = details.error.stack;
            delete details.error;
        }
        writeToLogFile('error', message, details);
    }
};

module.exports = logger;
