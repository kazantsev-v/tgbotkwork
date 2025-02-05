require('dotenv').config();
const token = process.env.bot_token;

config = {
    botToken: token,
    termsForWorkersLink:"https://law.2gis.ru/licensing-agreement",
    termsForCustomersLink:"https://law.2gis.ru/licensing-agreement",
    port: 3013,
    backendURL: 'http://localhost:3003/api'
}

module.exports = { config };