const { Telegraf, Scenes, session } = require('telegraf')
const express = require('express');
const fs = require('fs');
const https = require('https');
const { default: axios } = require('axios');
https.globalAgent.options.rejectUnauthorized = false;
const bodyParser = require('body-parser');
const { config } = require('./config/config');
const logger = require('./utils/logger');
const path = require('path');

const newUserMiddleware = require('./middlewares/newUserMiddleware');

process.env.NODE_ENV = 'development';

// Инициализация бота с обработкой ошибок
let bot;
try {
    bot = new Telegraf(config.botToken);
    logger.info('Telegram bot initialized');
} catch (error) {
    logger.error('Failed to initialize Telegram bot', { error });
    process.exit(1);
}

const scenes = require('./scenes');
const { keyboard } = require('telegraf/markup');

// Безопасная загрузка SSL сертификатов
let privateKey, certificate, credentials;
try {
    const keyPath = path.resolve(__dirname, '../privkey.pem');
    const certPath = path.resolve(__dirname, '../cert.pem');
    
    if (!fs.existsSync(keyPath)) {
        throw new Error(`Private key file not found at ${keyPath}`);
    }
    if (!fs.existsSync(certPath)) {
        throw new Error(`Certificate file not found at ${certPath}`);
    }
    
    privateKey = fs.readFileSync(keyPath, 'utf8');
    certificate = fs.readFileSync(certPath, 'utf8');
    
    credentials = {
        key: privateKey,
        cert: certificate,
    };
    
    logger.info('SSL certificates loaded successfully');
} catch (error) {
    logger.error('Failed to load SSL certificates', { error });
    process.exit(1);
}

// Обработка необработанных исключений и отклонений
process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    // Не завершаем процесс для поддержания работы бота
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', { 
        reason: reason instanceof Error ? reason.message : reason,
        stack: reason instanceof Error ? reason.stack : 'No stack trace'
    });
    // Не завершаем процесс для поддержания работы бота
});

// Инициализация сцен и middleware
const stage = new Scenes.Stage(Object.values(scenes));
bot.use(session());
bot.use(stage.middleware());

// Middleware для восстановления сцены
bot.use((ctx, next) => {
    try {
        if (ctx.session.currentScene) {
            return ctx.scene.enter(ctx.session.currentScene);
        }
        return next();
    } catch (error) {
        logger.error('Error in scene restoration middleware', { 
            userId: ctx.from?.id, 
            currentScene: ctx.session?.currentScene,
            error
        });
        // Сбрасываем сессию при ошибке и пытаемся продолжить
        ctx.session = {};
        return next();
    }
});

// Middleware для новых пользователей
bot.use(newUserMiddleware);

// Обработка ошибок в middleware и обработчиках
bot.catch((error, ctx) => {
    logger.error('Error in Telegraf context', { 
        error, 
        updateType: ctx.updateType,
        userId: ctx.from?.id
    });
    
    // Пытаемся отправить пользователю сообщение об ошибке
    try {
        ctx.reply('Извините, произошла ошибка. Мы уже работаем над её исправлением. Пожалуйста, попробуйте позже или отправьте команду /start для перезапуска бота.').catch(e => {
            logger.error('Failed to send error message to user', { error: e });
        });
    } catch (replyError) {
        logger.error('Error sending error message', { error: replyError });
    }
    
    return true; // Предотвращаем дальнейшее распространение ошибки
});

// Команда start с обработкой ошибок
bot.command('start', async (ctx) => {
    try {
        logger.info('User started the bot', { userId: ctx.from.id });
        await ctx.scene.enter('welcomeScene');
    } catch (error) {
        logger.error('Error handling /start command', { userId: ctx.from?.id, error });
        try {
            await ctx.reply('Извините, произошла ошибка при запуске бота. Пожалуйста, попробуйте еще раз.');
        } catch (replyError) {
            logger.error('Failed to send error message for /start', { error: replyError });
        }
    }
});

// Инициализация Express сервера
const app = express();
app.use(bodyParser.json());

// Эндпоинт для проверки здоровья системы
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Улучшенный эндпоинт для отправки сообщений
app.post('/send-message', async (req, res) => {
    const { telegramId, message } = req.body;
    
    if (!telegramId || !message) {
        logger.warn('Invalid request to /send-message', { body: req.body });
        return res.status(400).json({ 
            success: false, 
            error: 'telegramId and message are required' 
        });
    }

    try {
        logger.info('Sending message via API', { telegramId, messageLength: message.length });
        await bot.telegram.sendMessage(telegramId, message);
        res.status(200).json({ success: true });
    } catch (error) {
        logger.error('Failed to send message via API', { telegramId, error });
        res.status(500).json({ 
            success: false, 
            error: error.message,
            details: error.response?.description || 'Unknown Telegram API error'
        });
    }
});

// Создание HTTPS сервера
let httpsServer;
try {
    httpsServer = https.createServer(credentials, app);
    logger.info('HTTPS server created');
} catch (error) {
    logger.error('Failed to create HTTPS server', { error });
    process.exit(1);
}

// Запуск сервера
httpsServer.listen(config.port, () => {
    logger.info(`Express server running on port ${config.port}`);
});

// Безопасный запуск бота с обработкой ошибок и повторными попытками
const startBot = async (maxAttempts = 3) => {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
        try {
            attempts++;
            logger.info(`Launching bot (attempt ${attempts}/${maxAttempts})`);
            await bot.launch();
            logger.info('Bot successfully launched');
            return true;
        } catch (error) {
            logger.error(`Failed to launch bot (attempt ${attempts}/${maxAttempts})`, { error });
            
            if (attempts >= maxAttempts) {
                logger.error('Maximum number of launch attempts reached');
                throw error;
            }
            
            // Ждем перед следующей попыткой
            const delay = 5000 * attempts; // Увеличиваем задержку с каждой попыткой
            logger.info(`Retrying in ${delay / 1000} seconds...`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
};

// Запускаем бот
startBot().catch(error => {
    logger.error('Fatal error starting bot', { error });
    process.exit(1);
});

// Корректное завершение работы
const gracefulShutdown = (signal) => {
    logger.info(`Received ${signal}. Shutting down gracefully...`);
    
    // Устанавливаем таймаут для принудительного завершения, если корректное не сработает
    const forceExit = setTimeout(() => {
        logger.error('Forcing exit after timeout');
        process.exit(1);
    }, 10000);
    
    // Пробуем корректно завершить работу
    Promise.all([
        new Promise(resolve => {
            if (httpsServer) {
                httpsServer.close(() => {
                    logger.info('HTTPS server closed');
                    resolve();
                });
            } else {
                resolve();
            }
        }),
        new Promise(resolve => {
            if (bot) {
                bot.stop(signal);
                logger.info('Bot stopped');
            }
            resolve();
        })
    ]).then(() => {
        clearTimeout(forceExit);
        logger.info('Graceful shutdown completed');
        process.exit(0);
    }).catch(error => {
        logger.error('Error during graceful shutdown', { error });
        clearTimeout(forceExit);
        process.exit(1);
    });
};

// Регистрируем обработчики сигналов
process.once('SIGINT', () => gracefulShutdown('SIGINT'));
process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));