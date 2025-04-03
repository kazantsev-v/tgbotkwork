const { Telegraf, Scenes, session } = require('telegraf')
const express = require('express');
const fs = require('fs');
const https = require('https');
const { default: axios } = require('axios');
https.globalAgent.options.rejectUnauthorized = false;
const bodyParser = require('body-parser');
const { config } = require('./config/config');

const newUserMiddleware = require('./middlewares/newUserMiddleware');

process.env.NODE_ENV = 'development';

const bot = new Telegraf(config.botToken);

const scenes = require('./scenes');
const { keyboard } = require('telegraf/markup');

const privateKey = fs.readFileSync('privkey.pem', 'utf8');
const certificate = fs.readFileSync('cert.pem', 'utf8');

const credentials = {
    key: privateKey,
    cert: certificate,
};

const stage = new Scenes.Stage(Object.values(scenes));
bot.use(session());
bot.use(stage.middleware());

bot.use((ctx, next) => {
    if (ctx.session.currentScene) {
        ctx.scene.enter(ctx.session.currentScene);
    }
    return next();
});

bot.use(newUserMiddleware);

bot.command('start', async (ctx) => {
    await ctx.scene.enter('welcomeScene');
});

const app = express();
app.use(bodyParser.json());

// Эндпоинт для приема сообщений от бэкенда
app.post('/send-message', async (req, res) => {
    const { telegramId, message } = req.body;
    if (!telegramId || !message) {
        return res.status(400).json({ success: false, error: 'userId and message are required' });
    }

    try {
        await bot.telegram.sendMessage(telegramId, message);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error(`Ошибка отправки сообщения: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    }
});

const httpsServer = https.createServer(credentials, app);

httpsServer.listen(config.port, () => {
    console.log(`Express сервер запущен`);
});

bot.launch();

// Добавляем глобальный обработчик ошибок
bot.catch((err, ctx) => {
    console.error(`Ошибка при обработке обновления ${ctx.update.update_id}:`, err);
    
    // Логируем контекст сообщения для отладки
    const user = ctx.from;
    const chat = ctx.chat;
    console.log(`Пользователь: ${user ? user.id : 'неизвестно'}, Чат: ${chat ? chat.id : 'неизвестно'}`);
    
    // Отправляем сообщение пользователю
    try {
        ctx.reply('Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.');
    } catch (replyError) {
        console.error('Не удалось отправить сообщение об ошибке:', replyError);
    }
});

// Обработчик непойманных ошибок в промисах
process.on('unhandledRejection', (reason, promise) => {
    console.error('Непойманная ошибка в промисе:', reason);
});

// Обработчик непойманных исключений
process.on('uncaughtException', (error) => {
    console.error('Непойманное исключение:', error);
    // Не завершаем процесс, чтобы бот продолжал работать
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))