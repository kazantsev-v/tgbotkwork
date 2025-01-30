config = {
    botToken: process.env.botToken,
    termsForWorkersLink:"https://law.2gis.ru/licensing-agreement",
    termsForCustomersLink:"https://law.2gis.ru/licensing-agreement",
    port: 3013,
    backendURL: 'http://localhost:3001/api'
}

module.exports = { config };