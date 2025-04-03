const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const botToken = process.env.BOT_TOKEN;

// Удаляем /api из URL, если он присутствует, чтобы избежать двойного пути
const backendURLBase = process.env.BACKEND_URL || 'https://bot.moverspb.ru:3003';
const backendURL = backendURLBase.endsWith('/api') 
    ? backendURLBase 
    : `${backendURLBase}/api`;

const port = process.env.BOT_PORT || 3013;

exports.config = {
    botToken,
    backendURL,
    port
};

// Вывод URL для отладки
console.log(`Используется API URL: ${backendURL}`);