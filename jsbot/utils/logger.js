const fs = require('fs');
const path = require('path');
const { format } = require('date-fns');

// Создаем директорию для логов, если она не существует
const logsDir = path.join(__dirname, '..', '..', 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Получаем текущую дату для имени файла
const getCurrentDate = () => format(new Date(), 'yyyy-MM-dd');
const getCurrentDateTime = () => format(new Date(), 'yyyy-MM-dd HH:mm:ss');

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
    
    fs.appendFileSync(logFilePath, logString);
    
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
