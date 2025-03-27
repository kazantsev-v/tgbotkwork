require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

// Проверяем наличие токена и других обязательных параметров
const botToken = process.env.BOT_TOKEN;
if (!botToken) {
    console.error('\x1b[31m%s\x1b[0m', 'ОШИБКА: BOT_TOKEN не найден в переменных окружения!');
    console.log('Убедитесь, что вы создали файл .env в корневой директории проекта');
    console.log('и добавили в него строку: BOT_TOKEN=your_telegram_bot_token_here');
}

const config = {
    botToken: botToken || 'TEST_TOKEN',
    termsForWorkersLink: "https://law.2gis.ru/licensing-agreement",
    termsForCustomersLink: "https://law.2gis.ru/licensing-agreement",
    port: process.env.BOT_PORT || 3013,
    backendURL: process.env.BACKEND_URL || 'https://bot.moverspb.ru:3003/api',
    sslCertPath: process.env.SSL_CERT_PATH || './admin-panel/cert.pem',
    sslKeyPath: process.env.SSL_KEY_PATH || './admin-panel/privkey.pem'
};

module.exports = { config };