const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

// Убеждаемся, что URL не заканчивается на /api, чтобы избежать дублирования в запросах
const botToken = process.env.BOT_TOKEN;
const backendURL = (process.env.BACKEND_URL || 'http://bot.moverspb.ru:3003')
    .replace(/\/api$/, ''); // Убираем "/api" в конце, если он есть

const port = process.env.BOT_PORT || 3013;

exports.config = {
    botToken,
    backendURL,
    port
};

console.log(`Загружена конфигурация. API URL: ${backendURL}`);