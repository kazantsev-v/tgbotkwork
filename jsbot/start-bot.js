const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Загрузка переменных окружения
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Пути и настройки
const MAX_RETRIES = 10;
const RETRY_DELAY = 15000; // 15 секунд
let retryCount = 0;
let lastCrashTime = 0;
const CRASH_THRESHOLD = 60000; // 1 минута

// Функция для логирования с временем
function log(message) {
    const now = new Date().toISOString();
    console.log(`[${now}] ${message}`);
    
    // Дополнительно записываем лог в файл
    try {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        const logFile = path.join(logDir, `bot-${new Date().toISOString().split('T')[0]}.log`);
        fs.appendFileSync(logFile, `[${now}] ${message}\n`);
    } catch (error) {
        console.error(`Ошибка записи лога: ${error.message}`);
    }
}

// Запуск бота с автоматическим перезапуском
function startBot() {
    log('Starting Telegram Bot...');
    
    // Добавляем NODE_OPTIONS для увеличения таймаутов
    const nodeEnv = { 
        ...process.env,
        NODE_OPTIONS: '--dns-result-order=ipv4first --http-parser=legacy --tls-min-v1.0',
        NODE_TLS_REJECT_UNAUTHORIZED: '0', // Игнорировать проблемы с SSL
        HTTP_TIMEOUT: '60000', // 60 секунд таймаут для HTTP запросов
        HTTPS_TIMEOUT: '60000', // 60 секунд таймаут для HTTPS запросов
        DEBUG: process.env.DEBUG || 'telegraf:*' // Включаем дебаг логи для Telegraf
    };
    
    const botProcess = spawn('node', ['--unhandled-rejections=strict', 'index.js'], { 
        cwd: __dirname,
        stdio: 'inherit',
        env: nodeEnv
    });

    // Обработка сигналов для корректного завершения
    ['SIGINT', 'SIGTERM'].forEach(signal => {
        process.on(signal, () => {
            log(`Получен сигнал ${signal}, завершение работы...`);
            botProcess.kill(signal);
            setTimeout(() => {
                process.exit(0);
            }, 1000);
        });
    });

    botProcess.on('close', (code) => {
        const now = Date.now();
        log(`Bot process exited with code ${code}`);
        
        if (code !== 0) {
            // Проверяем, не происходит ли перезапуск слишком часто
            const timeSinceLastCrash = now - lastCrashTime;
            lastCrashTime = now;
            
            // Если бот падает слишком часто, увеличиваем задержку
            let currentDelay = RETRY_DELAY;
            if (timeSinceLastCrash < CRASH_THRESHOLD) {
                currentDelay = RETRY_DELAY * 2;
                log(`Обнаружены частые падения бота, увеличиваем задержку до ${currentDelay/1000} секунд`);
            }
            
            retryCount++;
            
            if (retryCount <= MAX_RETRIES) {
                log(`Restarting bot in ${currentDelay/1000} seconds... (attempt ${retryCount}/${MAX_RETRIES})`);
                setTimeout(startBot, currentDelay);
            } else {
                log(`Maximum retry count reached (${MAX_RETRIES}). Not restarting automatically.`);
                log(`Для ручного перезапуска бота используйте команду: node start-bot.js`);
                process.exit(1);
            }
        } else {
            // Если бот завершился без ошибок, сбрасываем счетчик
            retryCount = 0;
        }
    });
}

// Создаем директорию для логов, если её нет
try {
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} catch (error) {
    console.error(`Ошибка при создании директории логов: ${error.message}`);
}

// Запуск бота
startBot();
