const { spawn, exec } = require('child_process');
const path = require('path');
const chalk = require('chalk');
const fs = require('fs');
const readline = require('readline');
const net = require('net');
const dotenv = require('dotenv');

// Загрузка переменных окружения
dotenv.config({ path: path.join(__dirname, '.env') });

// Пути к директориям проекта
const ROOT_DIR = __dirname;
const JSBOT_DIR = path.join(ROOT_DIR, 'jsbot');
const JSBACK_DIR = path.join(ROOT_DIR, 'jsback');
const JSBACK_DIST_DIR = path.join(JSBACK_DIR, 'dist');
const ADMIN_PANEL_DIR = path.join(ROOT_DIR, 'admin-panel');

// Порты для компонентов
const BACKEND_PORT = process.env.BACKEND_PORT || 3003;
const BOT_PORT = process.env.BOT_PORT || 3013;
const ADMIN_PORT = process.env.ADMIN_PORT || 4200;

// Создаем интерфейс для чтения ввода пользователя
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Функция для проверки занятости порта
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', () => resolve(true))
            .once('listening', () => {
                server.close();
                resolve(false);
            })
            .listen(port);
    });
}

// Функция для получения ID процесса, использующего порт (Unix/Linux)
function getProcessIdByPort(port) {
    return new Promise((resolve, reject) => {
        const isWindows = process.platform === 'win32';
        const command = isWindows
            ? `netstat -ano | findstr :${port}`
            : `lsof -i :${port} -t`;

        exec(command, (error, stdout) => {
            if (error) {
                // Если команда завершилась с ошибкой, возможно порт не занят
                resolve(null);
                return;
            }

            if (isWindows) {
                // Парсинг вывода Windows netstat
                const lines = stdout.trim().split('\n');
                if (lines.length > 0) {
                    const line = lines[0];
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 5) {
                        resolve(parts[4]);
                        return;
                    }
                }
            } else {
                // Парсинг вывода Unix lsof
                const pid = stdout.trim().split('\n')[0];
                if (pid) {
                    resolve(pid);
                    return;
                }
            }
            resolve(null);
        });
    });
}

// Функция для освобождения порта
async function freePort(port, forceFree = false) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
        return true;
    }

    const pid = await getProcessIdByPort(port);
    if (!pid) {
        console.log(chalk.yellow(`Порт ${port} занят, но не удалось определить процесс.`));
        return false;
    }

    if (forceFree) {
        // Автоматическое освобождение порта
        try {
            const isWindows = process.platform === 'win32';
            const command = isWindows ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
            
            await new Promise((resolve, reject) => {
                exec(command, (error) => {
                    if (error) {
                        console.log(chalk.red(`Не удалось завершить процесс ${pid}: ${error.message}`));
                        resolve(false);
                    } else {
                        console.log(chalk.green(`Процесс ${pid} успешно завершен, порт ${port} освобожден.`));
                        resolve(true);
                    }
                });
            });
            
            // Дополнительная проверка, что порт освободился
            return !(await isPortInUse(port));
        } catch (error) {
            console.log(chalk.red(`Ошибка при освобождении порта ${port}: ${error.message}`));
            return false;
        }
    } else {
        return new Promise((resolve) => {
            rl.question(
                chalk.yellow(`Порт ${port} занят процессом ${pid}. Завершить процесс? (y/n): `),
                (answer) => {
                    if (answer.toLowerCase() === 'y') {
                        const isWindows = process.platform === 'win32';
                        const command = isWindows ? `taskkill /F /PID ${pid}` : `kill -9 ${pid}`;
                        
                        exec(command, (error) => {
                            if (error) {
                                console.log(chalk.red(`Не удалось завершить процесс ${pid}: ${error.message}`));
                                resolve(false);
                            } else {
                                console.log(chalk.green(`Процесс ${pid} успешно завершен, порт ${port} освобожден.`));
                                resolve(true);
                            }
                        });
                    } else {
                        resolve(false);
                    }
                }
            );
        });
    }
}

// Константы для повторного запуска
const MAX_RETRIES = 5;
const RETRY_DELAY = 10000; // 10 секунд

// Переменные для отслеживания перезапусков
let botRetries = 0;
let backendRetries = 0;
let adminRetries = 0;

// Хранение PID всех запущенных процессов
const runningProcesses = {
    bot: null,
    backend: null,
    admin: null,
    children: [] // Хранение всех дочерних процессов
};

// Добавляем логирование с отметкой времени
function logWithTime(message, color = 'white') {
    const now = new Date().toISOString();
    console.log(chalk[color](`[${now}] ${message}`));
}

// Функция для корректного завершения всех процессов
function shutdownGracefully(signal) {
    logWithTime(`\nПолучен сигнал ${signal}. Завершение всех процессов...`, 'red');
    
    // Закрываем readline интерфейс
    if (rl && typeof rl.close === 'function') {
        rl.close();
    }
    
    // Завершаем все дочерние процессы
    runningProcesses.children.forEach(proc => {
        if (proc && typeof proc.kill === 'function') {
            try {
                proc.kill('SIGTERM');
            } catch (error) {
                console.error(`Ошибка при завершении процесса: ${error.message}`);
            }
        }
    });
    
    // Записываем PID в файл перед выходом для возможности дальнейшей очистки
    try {
        const pidInfo = {
            mainPid: process.pid,
            children: runningProcesses.children.map(p => p.pid).filter(Boolean)
        };
        fs.writeFileSync(path.join(__dirname, 'last-run-pids.json'), JSON.stringify(pidInfo, null, 2));
    } catch (error) {
        console.error(`Ошибка при записи PID: ${error.message}`);
    }
    
    logWithTime('Все процессы остановлены.', 'red');
    
    // Принудительное завершение через 2 секунды, если что-то блокирует выход
    setTimeout(() => {
        logWithTime('Принудительное завершение программы.', 'red');
        process.exit(0);
    }, 2000);
}

// Обработка различных сигналов завершения
['SIGINT', 'SIGTERM', 'SIGQUIT', 'SIGHUP', 'SIGTSTP'].forEach(signal => {
    process.on(signal, () => shutdownGracefully(signal));
});

// Функция для запуска процесса с цветным выводом логов и автоматическим перезапуском
function startProcess(command, args, cwd, name, color, onError = null) {
    logWithTime(`Starting ${name}...`, color);
    
    const childProcess = spawn(command, args, { 
        cwd, 
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' }, // Добавляем для решения проблем с SSL
        detached: false // Убедимся, что процесс не отсоединяется
    });
    
    // Сохраняем процесс в список для дальнейшего завершения
    runningProcesses.children.push(childProcess);
    
    // Записываем PID в соответствующее поле
    if (name === 'TG Bot') {
        runningProcesses.bot = childProcess;
    } else if (name === 'Backend') {
        runningProcesses.backend = childProcess;
    } else if (name === 'Admin Panel') {
        runningProcesses.admin = childProcess;
    }
    
    // Логируем PID процесса
    logWithTime(`${name} started with PID: ${childProcess.pid}`, color);

    let errorBuffer = '';
    
    childProcess.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.log(chalk[color](`[${name}] ${line}`));
        });
    });

    childProcess.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        errorBuffer += data.toString();
        
        lines.forEach(line => {
            if (line.trim()) console.error(chalk[color].bold(`[${name} ERROR] ${line}`));
        });

        // Если предоставлена функция обработки ошибок, вызываем её
        if (onError) {
            onError(data.toString());
        }
    });

    childProcess.on('close', (code) => {
        logWithTime(`[${name}] Process exited with code ${code}`, color);
        
        // Удаляем процесс из списка запущенных
        const index = runningProcesses.children.findIndex(p => p === childProcess);
        if (index !== -1) {
            runningProcesses.children.splice(index, 1);
        }
        
        // Проверяем, нужно ли перезапустить процесс
        if (code !== 0) {
            let shouldRestart = false;
            let retryCount = 0;
            let retryDelay = RETRY_DELAY;
            
            // Определяем стратегию перезапуска в зависимости от типа компонента
            if (name === 'TG Bot') {
                retryCount = ++botRetries;
                // Проверяем ошибки соединения
                if (errorBuffer.includes('ETIMEDOUT') || 
                    errorBuffer.includes('ECONNREFUSED') || 
                    errorBuffer.includes('ECONNRESET') ||
                    errorBuffer.includes('getaddrinfo') ||
                    errorBuffer.includes('request failed')) {
                    shouldRestart = true;
                    console.log(chalk.yellow(`Обнаружена ошибка сети для ${name}. Будет выполнен перезапуск...`));
                }
            } else if (name === 'Backend') {
                retryCount = ++backendRetries;
                // Проверяем ошибки бэкенда
                if (errorBuffer.includes('EADDRINUSE')) {
                    shouldRestart = false; // Особый случай, обрабатывается отдельно
                } else {
                    shouldRestart = true;
                }
            } else if (name === 'Admin Panel') {
                retryCount = ++adminRetries;
                shouldRestart = true;
            }
            
            // Если достигнуто максимальное количество попыток, прекращаем перезапуск
            if (retryCount > MAX_RETRIES) {
                console.log(chalk.red(`Достигнуто максимальное количество попыток перезапуска для ${name} (${MAX_RETRIES})`));
                shouldRestart = false;
            }
            
            // Если нужно перезапустить, выполняем перезапуск с задержкой
            if (shouldRestart) {
                console.log(chalk[color](`Перезапуск ${name} через ${retryDelay/1000} секунд... (попытка ${retryCount}/${MAX_RETRIES})`));
                
                setTimeout(() => {
                    if (name === 'TG Bot') {
                        startProcess(command, args, cwd, name, color, onError);
                    } else if (name === 'Backend') {
                        startBackend();
                    } else if (name === 'Admin Panel') {
                        startProcess(command, args, cwd, name, color, onError);
                    }
                }, retryDelay);
            } else if (name === 'Backend') {
                // Особая обработка для бэкенда, предлагаем интерактивный выбор
                rl.question(
                    chalk.yellow('Хотите попробовать запустить бэкенд снова на другом порту? (y/n): '),
                    async (answer) => {
                        if (answer.toLowerCase() === 'y') {
                            // Пробуем освободить порт и запустить бэкенд снова
                            await freePort(BACKEND_PORT, true);
                            startBackend();
                        }
                    }
                );
            }
        }
    });

    return childProcess;
}

// Обработчик ошибок для бота
function handleBotError(errorText) {
    if (errorText.includes('ETIMEDOUT') || 
        errorText.includes('ECONNREFUSED') || 
        errorText.includes('ECONNRESET')) {
        console.log(chalk.yellow('Обнаружена ошибка сети для Telegram Bot. Проверьте интернет-соединение.'));
    }
    
    if (errorText.includes('bot token')) {
        console.log(chalk.red('Ошибка с токеном бота. Проверьте TOKEN в .env файле.'));
    }
}

// Обновляем файл конфигурации бэкенда для нового порта (временное решение)
function updateBackendConfig(port) {
    const configPath = path.join(JSBACK_DIR, 'src', 'config.ts');
    
    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, 'utf8');
        
        // Заменяем порт в файле конфигурации
        configContent = configContent.replace(/port:\s*\d+/, `port: ${port}`);
        
        fs.writeFileSync(configPath, configContent);
        console.log(chalk.green(`Конфигурация бэкенда обновлена, порт: ${port}`));
    } else {
        console.log(chalk.yellow(`Не удалось найти файл конфигурации бэкенда: ${configPath}`));
    }
}

// Функция для компиляции и запуска бэкенда
async function startBackend() {
    // Проверяем, свободен ли порт для бэкенда
    const backendPortFree = await isPortInUse(BACKEND_PORT);
    
    if (backendPortFree) {
        console.log(chalk.yellow(`Порт ${BACKEND_PORT} для бэкенда занят. Попытка освободить...`));
        const freed = await freePort(BACKEND_PORT);
        
        if (!freed) {
            console.log(chalk.yellow(`Не удалось освободить порт ${BACKEND_PORT}. Пробуем альтернативный порт...`));
            const alternativePort = BACKEND_PORT + 10; // Пробуем порт на 10 выше
            
            if (!(await isPortInUse(alternativePort))) {
                console.log(chalk.green(`Используем альтернативный порт для бэкенда: ${alternativePort}`));
                updateBackendConfig(alternativePort);
                
                // Компилируем бэкенд
                await new Promise((resolve) => {
                    const compileProcess = startProcess(
                        'npx', 
                        ['tsc'], 
                        JSBACK_DIR, 
                        'Backend Compile', 
                        'cyan'
                    );
                    
                    compileProcess.on('close', () => resolve());
                });
                
                // Запускаем бэкенд на новом порту
                return startProcess(
                    'node', 
                    ['server.js'], 
                    JSBACK_DIST_DIR, 
                    'Backend', 
                    'green',
                    handleBackendError
                );
            } else {
                console.log(chalk.red(`И альтернативный порт ${alternativePort} тоже занят. Не удается запустить бэкенд.`));
                return null;
            }
        }
    }
    
    // Если порт свободен или был освобожден, запускаем бэкенд
    return startProcess(
        'node', 
        ['server.js'], 
        JSBACK_DIST_DIR, 
        'Backend', 
        'green',
        handleBackendError
    );
}

// Обработчик ошибок для бэкенда
function handleBackendError(errorText) {
    if (errorText.includes('EADDRINUSE')) {
        const matches = errorText.match(/port: (\d+)/);
        if (matches && matches[1]) {
            const port = parseInt(matches[1]);
            console.log(chalk.yellow(`Будет предпринята попытка освободить порт ${port} автоматически...`));
            
            // Запускаем асинхронную функцию для освобождения порта
            (async () => {
                await freePort(port, true);
            })();
        }
    }
}

// Запуск всех компонентов
async function startAll() {
    // Создаем файл с PID основного процесса
    fs.writeFileSync(path.join(__dirname, 'main-process.pid'), process.pid.toString());
    
    logWithTime(`Основной процесс запущен с PID: ${process.pid}`, 'magenta');
    
    // Запуск телеграм бота с обработчиком ошибок
    const botProcess = startProcess(
        'node', 
        ['index.js'], 
        JSBOT_DIR, 
        'TG Bot', 
        'blue',
        handleBotError
    );

    // Запуск бэкенда
    const backendProcess = await startBackend();

    // Запуск админ-панели
    const adminProcess = startProcess(
        'ng', 
        ['serve', '--host', '0.0.0.0', '--ssl', 'true', '--ssl-cert', './cert.pem', '--ssl-key', './privkey.pem'],
        ADMIN_PANEL_DIR, 
        'Admin Panel', 
        'yellow'
    );

    logWithTime('All services started. Press Ctrl+C to stop all processes.', 'magenta');
    
    // Проверка активности дочерних процессов каждую минуту
    const monitorInterval = setInterval(() => {
        const activeCount = runningProcesses.children.filter(p => p && !p.killed).length;
        logWithTime(`Active child processes: ${activeCount}`, 'gray');
    }, 60000);
    
    // Очистка интервала при завершении
    process.on('exit', () => {
        clearInterval(monitorInterval);
    });
}

// Запускаем все компоненты
startAll();
