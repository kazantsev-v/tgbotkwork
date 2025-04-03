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

// Функция для логирования с временем
function log(message) {
    const now = new Date().toISOString();
    console.log(`[${now}] ${message}`);
}

// Запуск бота с автоматическим перезапуском
function startBot() {
    log('Starting Telegram Bot...');
    
    // Добавляем NODE_OPTIONS для увеличения таймаутов
    process.env.NODE_OPTIONS = '--dns-result-order=ipv4first --http-parser=legacy --tls-min-v1.0';
    
    const botProcess = spawn('node', ['index.js'], { 
        cwd: __dirname,
        stdio: 'inherit',
        env: {
            ...process.env,
            NODE_TLS_REJECT_UNAUTHORIZED: '0', // Игнорировать проблемы с SSL
            HTTP_TIMEOUT: '60000', // 60 секунд таймаут для HTTP запросов
            HTTPS_TIMEOUT: '60000' // 60 секунд таймаут для HTTPS запросов
        }
    });

    botProcess.on('close', (code) => {
        log(`Bot process exited with code ${code}`);
        
        if (code !== 0) {
            retryCount++;
            
            if (retryCount <= MAX_RETRIES) {
                log(`Restarting bot in ${RETRY_DELAY/1000} seconds... (attempt ${retryCount}/${MAX_RETRIES})`);
                setTimeout(startBot, RETRY_DELAY);
            } else {
                log(`Maximum retry count reached (${MAX_RETRIES}). Not restarting automatically.`);
                process.exit(1);
            }
        }
    });
}

// Запуск бота
startBot();
