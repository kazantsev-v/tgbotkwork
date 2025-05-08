const { Telegraf, Scenes, session } = require('telegraf')
const express = require('express');
const fs = require('fs');
const https = require('https');
const { default: axios } = require('axios');
https.globalAgent.options.rejectUnauthorized = false;
const bodyParser = require('body-parser');
const { config } = require('./config/config');
const { getUsersProfile } = require('./utils/user'); // Добавляем импорт функции getUsersProfile

const newUserMiddleware = require('./middlewares/newUserMiddleware');
const errorHandlingMiddleware = require('./middlewares/errorHandlingMiddleware');

// Улучшенный middleware для логирования запросов с информацией о пользователе
const requestLoggingMiddleware = (ctx, next) => {
    const userId = ctx.from?.id || 'Unknown';
    const username = ctx.from?.username ? `@${ctx.from.username}` : 'No username';
    const updateType = ctx.updateType || 'Unknown';
    
    console.log(`[BOT] Новый ${updateType} от ${userId} (${username})`);
    
    // Если это сообщение, логируем его содержимое
    if (ctx.message?.text) {
        console.log(`[BOT] Сообщение: "${ctx.message.text}"`);
    } else if (ctx.callbackQuery?.data) {
        console.log(`[BOT] Callback data: "${ctx.callbackQuery.data}"`);
    }
    
    return next();
};

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
bot.use(requestLoggingMiddleware); // Логирование должно быть до всех остальных обработчиков
bot.use(stage.middleware());

// Добавляем обработчик ошибок сцен
bot.use((ctx, next) => {
    if (ctx.session?.currentScene) {
        try {
            return ctx.scene.enter(ctx.session.currentScene);
        } catch (error) {
            console.error(`Ошибка при входе в сцену ${ctx.session.currentScene}:`, error.message);
            // Проверяем, существует ли сцена
            const sceneExists = Object.values(scenes).some(s => s.id === ctx.session.currentScene);
            if (!sceneExists) {
                console.log(`Сцена ${ctx.session.currentScene} не найдена, переход в welcomeScene`);
                ctx.session.currentScene = 'welcomeScene';
                return ctx.scene.enter('welcomeScene');
            }
        }
    }
    return next();
});

// Добавляем расширенный обработчик для команды /start
bot.command('start', async (ctx) => {
    console.log(`Получена команда /start от пользователя ${ctx.from.id}`);
    try {
        // Проверяем, существует ли пользователь в базе данных
        const profile = await getUsersProfile(ctx.from.id);
        
        if (profile) {
            console.log(`Найден существующий профиль для пользователя ${ctx.from.id}`);
            // Сохраняем важные данные из профиля, но не сбрасываем сессию полностью
            ctx.session = ctx.session || {};
            ctx.session.telegramId = ctx.from.id;
            ctx.session.userId = profile.id;
            
            if (profile.scene) {
                ctx.session.scene = profile.scene;
            }
            
            if (profile.step !== undefined) {
                ctx.session.step = profile.step;
            } else {
                ctx.session.step = 0;
            }
            
            // Переходим на welcomeScene, которая выполнит правильную маршрутизацию
            await ctx.scene.enter('welcomeScene');
        } else {
            console.log(`Профиль не найден для пользователя ${ctx.from.id}, начинаем регистрацию`);
            // Сбрасываем сессию для нового пользователя
            ctx.session = { 
                telegramId: ctx.from.id,
                step: 0
            };
            await ctx.scene.enter('welcomeScene');
        }
    } catch (error) {
        console.error('Ошибка при обработке команды /start:', error);
        await ctx.reply('Произошла ошибка при запуске бота. Пожалуйста, попробуйте снова через несколько минут.');
    }
});

// Добавляем обработчик текстовых сообщений, которые не обработаны сценами
bot.on('text', async (ctx) => {
    if (!ctx.scene?.current) {
        console.log(`Получено сообщение вне сцены: ${ctx.message.text}`);
        return ctx.scene.enter('welcomeScene');
    }
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
    
    // Специальная обработка ошибок HTML-форматирования
    if (err.description && err.description.includes("can't parse entities")) {
        console.log('Ошибка HTML-форматирования в сообщении:', err.description);
        
        let errorInfo = '';
        if (err.on && err.on.payload && err.on.payload.text) {
            // Выводим только часть текста для отладки
            const textSample = err.on.payload.text.substring(0, 100) + '...';
            errorInfo = `\nПроблема в тексте: ${textSample}`;
        }
        
        // Отправляем информативное сообщение пользователю
        try {
            ctx.reply(`Извините, произошла ошибка форматирования сообщения. Мы исправим это в ближайшее время.${errorInfo}`);
        } catch (replyError) {
            console.error('Не удалось отправить сообщение об ошибке:', replyError);
        }
        return;
    }
    
    // Стандартное сообщение об ошибке для других случаев
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