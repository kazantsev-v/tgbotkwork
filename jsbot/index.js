const { Telegraf, Scenes, session } = require('telegraf')
const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const { default: axios } = require('axios');
https.globalAgent.options.rejectUnauthorized = false;
const bodyParser = require('body-parser');
const { config } = require('./config/config');
const logger = require('./utils/logger');
const path = require('path');

const newUserMiddleware = require('./middlewares/newUserMiddleware');

process.env.NODE_ENV = 'development';

// Инициализация бота с более надежной обработкой ошибок
let bot;
try {
    if (!config.botToken || config.botToken === 'TEST_TOKEN') {
        throw new Error('Bot token is missing or invalid. Please check your .env file.');
    }
    
    bot = new Telegraf(config.botToken);
    logger.info('Telegram bot initialized with token');
} catch (error) {
    logger.error('Failed to initialize Telegram bot', { error });
    
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    } else {
        // В режиме разработки продолжаем работу, но без функциональности бота
        logger.warn('Running in development mode without bot functionality');
        bot = {
            use: () => {},
            catch: () => {},
            command: () => {},
            launch: async () => { return Promise.resolve(true); },
            stop: () => {},
            telegram: { sendMessage: async () => { logger.warn('Bot not initialized, message not sent'); } }
        };
    }
}

const scenes = require('./scenes');
const { keyboard } = require('telegraf/markup');

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

// Функция для создания сервера с проверкой наличия SSL-сертификатов
function createServer() {
    // Проверяем наличие SSL-сертификатов, используя пути из конфигурации
    const keyPath = path.resolve(__dirname, '..', config.sslKeyPath);
    const certPath = path.resolve(__dirname, '..', config.sslCertPath);
    
    // Проверяем также в корневой и admin-panel директориях
    const rootKeyPath = path.resolve(__dirname, '../privkey.pem');
    const rootCertPath = path.resolve(__dirname, '../cert.pem');
    const adminPanelPath = path.resolve(__dirname, '../admin-panel');
    const adminKeyPath = path.join(adminPanelPath, 'privkey.pem');
    const adminCertPath = path.join(adminPanelPath, 'cert.pem');
    
    // Определяем, какие пути к сертификатам существуют
    const keyPathExists = fs.existsSync(keyPath);
    const certPathExists = fs.existsSync(certPath);
    const rootPathsExist = fs.existsSync(rootKeyPath) && fs.existsSync(rootCertPath);
    const adminPathsExist = fs.existsSync(adminKeyPath) && fs.existsSync(adminCertPath);
    
    // Логируем информацию о путях для отладки
    logger.debug('SSL certificate paths', {
        configKeyPath: keyPath,
        configCertPath: certPath,
        configKeyExists: keyPathExists,
        configCertExists: certPathExists,
        rootPathsExist,
        adminPathsExist
    });
    
    // Определяем, какие пути использовать
    let actualKeyPath, actualCertPath;
    let hasSSLCerts = false;
    
    if (keyPathExists && certPathExists) {
        actualKeyPath = keyPath;
        actualCertPath = certPath;
        hasSSLCerts = true;
        logger.info('Using SSL certificates from config paths');
    } else if (rootPathsExist) {
        actualKeyPath = rootKeyPath;
        actualCertPath = rootCertPath;
        hasSSLCerts = true;
        logger.info('Using SSL certificates from root directory');
    } else if (adminPathsExist) {
        actualKeyPath = adminKeyPath;
        actualCertPath = adminCertPath;
        hasSSLCerts = true;
        logger.info('Using SSL certificates from admin-panel directory');
    }
    
    if (hasSSLCerts) {
        try {
            const privateKey = fs.readFileSync(actualKeyPath, 'utf8');
            const certificate = fs.readFileSync(actualCertPath, 'utf8');
            
            const credentials = {
                key: privateKey,
                cert: certificate,
            };
            
            return https.createServer(credentials, app);
        } catch (error) {
            logger.error('Failed to load SSL certificates, using HTTP instead', { error });
        }
    } else {
        logger.warn('SSL certificates not found, using HTTP instead');
    }
    
    // Если сертификаты не найдены или возникла ошибка, запускаем HTTP-сервер
    return http.createServer(app);
}

// Создаем сервер
const server = createServer();

// Запуск сервера
server.listen(config.port, () => {
    const protocol = server instanceof https.Server ? 'HTTPS' : 'HTTP';
    logger.info(`${protocol} server running on port ${config.port}`);
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
            if (server) {
                server.close(() => {
                    logger.info('Server closed');
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