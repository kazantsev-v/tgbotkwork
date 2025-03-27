/**
 * Скрипт для запуска и мониторинга всех компонентов системы
 * Запускать с помощью: node start-service.js
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Настройки
const RESTART_DELAY = 5000; // 5 секунд между перезапусками
const MAX_RESTARTS = 5; // Максимальное количество перезапусков за период
const RESTART_PERIOD = 60 * 60 * 1000; // 1 час - период сброса счетчика перезапусков

// Создаем папку для логов, если она не существует
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Функция для создания потоков записи логов
function createLogStreams(name) {
    const date = new Date().toISOString().split('T')[0];
    const stdoutPath = path.join(logsDir, `${name}-stdout-${date}.log`);
    const stderrPath = path.join(logsDir, `${name}-stderr-${date}.log`);
    
    const stdout = fs.createWriteStream(stdoutPath, { flags: 'a' });
    const stderr = fs.createWriteStream(stderrPath, { flags: 'a' });
    
    return { stdout, stderr };
}

// Класс для управления сервисом
class ServiceManager {
    constructor(name, command, args, options = {}) {
        this.name = name;
        this.command = command;
        this.args = args;
        this.options = {
            cwd: options.cwd || __dirname,
            env: { ...process.env, ...(options.env || {}) },
            shell: true // Добавляем shell: true для более надежного запуска
        };
        
        this.process = null;
        this.restarts = 0;
        this.running = false;
        
        // Сбрасываем счетчик перезапусков периодически
        setInterval(() => {
            if (this.restarts > 0) {
                console.log(`[${this.name}] Resetting restart counter from ${this.restarts} to 0`);
                this.restarts = 0;
            }
        }, RESTART_PERIOD);
    }
    
    // Запустить сервис
    start() {
        if (this.running) {
            console.log(`[${this.name}] Service is already running`);
            return;
        }
        
        console.log(`[${this.name}] Starting service: ${this.command} ${this.args.join(' ')}`);
        this.running = true;
        
        // Создаем потоки для логов
        const { stdout: stdoutStream, stderr: stderrStream } = createLogStreams(this.name);
        
        // Запускаем процесс
        this.process = spawn(this.command, this.args, this.options);
        
        // Логируем время запуска
        const timestamp = new Date().toISOString();
        stdoutStream.write(`\n[${timestamp}] === Service ${this.name} started ===\n`);
        
        // Подключаем обработчики событий
        this.process.stdout.pipe(stdoutStream);
        this.process.stderr.pipe(stderrStream);
        
        // Также выводим в консоль
        this.process.stdout.on('data', (data) => {
            process.stdout.write(`[${this.name}] ${data}`);
        });
        
        this.process.stderr.on('data', (data) => {
            process.stderr.write(`[${this.name} ERROR] ${data}`);
        });
        
        // Обработка завершения процесса
        this.process.on('close', (code) => {
            this.running = false;
            const exitMessage = `\n[${new Date().toISOString()}] === Service ${this.name} exited with code ${code} ===\n`;
            stdoutStream.write(exitMessage);
            console.log(`[${this.name}] Service exited with code ${code}`);
            
            // Закрываем потоки логов
            stdoutStream.end();
            stderrStream.end();
            
            // Перезапускаем сервис при необходимости
            this.handleRestart(code);
        });
        
        return this.process;
    }
    
    // Обработка перезапуска
    handleRestart(exitCode) {
        // Увеличиваем счетчик перезапусков
        this.restarts++;
        
        // Если превышено максимальное количество, выводим предупреждение
        if (this.restarts > MAX_RESTARTS) {
            console.error(`[${this.name}] Too many restarts (${this.restarts}). Waiting for period reset.`);
            setTimeout(() => {
                console.log(`[${this.name}] Attempting restart after excessive failures`);
                this.start();
            }, RESTART_PERIOD);
            return;
        }
        
        // Перезапускаем с задержкой
        console.log(`[${this.name}] Restarting service in ${RESTART_DELAY/1000} seconds (restart #${this.restarts})`);
        setTimeout(() => this.start(), RESTART_DELAY);
    }
    
    // Остановить сервис
    stop() {
        if (!this.running || !this.process) {
            console.log(`[${this.name}] Service is not running`);
            return;
        }
        
        console.log(`[${this.name}] Stopping service...`);
        
        // Отправляем сигнал для корректного завершения
        this.process.kill('SIGTERM');
        
        // Устанавливаем таймаут для принудительного завершения
        setTimeout(() => {
            if (this.running && this.process) {
                console.log(`[${this.name}] Service did not terminate gracefully, forcing shutdown...`);
                this.process.kill('SIGKILL');
            }
        }, 10000);
    }
}

// Создаем и запускаем сервисы с использованием 'node' вместо полных путей
const botService = new ServiceManager(
    'telegram-bot',
    'node',
    ['jsbot/index.js'],
    { cwd: __dirname }
);

const backendService = new ServiceManager(
    'backend',
    'node',
    ['jsback/dist/server.js'],
    { cwd: __dirname }
);

// Для админки можно использовать npx для запуска Angular CLI если нет глобальной установки
const adminPanelService = new ServiceManager(
    'admin-panel',
    'npx',
    ['ng', 'serve', '--host', '0.0.0.0', '--port', '4200', '--disable-host-check'],
    { cwd: path.join(__dirname, 'admin-panel') }
);

// Отображаем информацию о запуске
console.log('=== Starting Services ===');
console.log('Working directory:', __dirname);
console.log('Log directory:', logsDir);

// Функция для задержки
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Запускаем сервисы последовательно
async function startServices() {
    try {
        console.log('\nStarting backend service...');
        backendService.start();
        
        // Ждем, чтобы бэкенд успел инициализироваться
        await delay(8000);
        
        console.log('\nStarting Telegram bot service...');
        botService.start();
        
        // Ждем, чтобы бот успел инициализироваться
        await delay(5000);
        
        console.log('\nStarting admin panel service...');
        adminPanelService.start();
    } catch (error) {
        console.error('Error starting services:', error);
    }
}

// Запускаем сервисы
startServices();

// Обрабатываем сигналы завершения
process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

function handleShutdown(signal) {
    console.log(`\nReceived ${signal}. Shutting down all services...`);
    
    // Останавливаем сервисы
    adminPanelService.stop();
    botService.stop();
    backendService.stop();
    
    // Ждем немного и выходим
    setTimeout(() => {
        console.log('All services stopped. Exiting.');
        process.exit(0);
    }, 5000);
}

console.log('\nService manager is running. Press Ctrl+C to stop all services.');
