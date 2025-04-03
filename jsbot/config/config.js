const dotenv = require('dotenv');
const path = require('path');

// Загружаем переменные среды из основного .env файла
dotenv.config({ path: path.join(__dirname, '../../.env') });

const botToken = process.env.BOT_TOKEN;
const backendURL = process.env.BACKEND_URL || 'https://bot.moverspb.ru:3003/api';
const apiUrl = backendURL; // Убедимся, что apiUrl имеет тот же URL, что и backendURL

const port = process.env.BOT_PORT || 3013;

// Экспортируем конфигурацию с обоими URL
exports.config = {
    botToken,
    backendURL,
    apiUrl,
    port
};

// Логируем для отладки
console.log(`Конфигурация бота загружена. API URL: ${apiUrl}`);