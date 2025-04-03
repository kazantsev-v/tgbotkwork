const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const botToken = process.env.BOT_TOKEN;
const backendURL = process.env.BACKEND_URL || 'https://bot.moverspb.ru:3003/api';
const port = process.env.BOT_PORT || 3013;

exports.config = {
    botToken,
    backendURL,
    port
};