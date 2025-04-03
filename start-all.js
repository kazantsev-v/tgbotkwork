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

// Функция для запуска процесса с цветным выводом логов
function startProcess(command, args, cwd, name, color, onError = null) {
    console.log(chalk[color](`Starting ${name}...`));
    
    const process = spawn(command, args, { 
        cwd, 
        shell: true,
        stdio: ['inherit', 'pipe', 'pipe']
    });

    process.stdout.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.log(chalk[color](`[${name}] ${line}`));
        });
    });

    process.stderr.on('data', (data) => {
        const lines = data.toString().trim().split('\n');
        lines.forEach(line => {
            if (line.trim()) console.error(chalk[color].bold(`[${name} ERROR] ${line}`));
        });

        // Если предоставлена функция обработки ошибок, вызываем её
        if (onError) {
            onError(data.toString());
        }
    });

    process.on('close', (code) => {
        console.log(chalk[color].bold(`[${name}] Process exited with code ${code}`));
        
        // Если процесс завершился с ошибкой и это бэкенд, предложить запустить его снова
        if (code !== 0 && name === 'Backend') {
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
    });

    return process;
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
    // Запуск телеграм бота
    const botProcess = startProcess(
        'node', 
        ['index.js'], 
        JSBOT_DIR, 
        'TG Bot', 
        'blue'
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

    // Обработка завершения процесса
    process.on('SIGINT', () => {
        console.log(chalk.red.bold('\nStopping all processes...'));
        
        botProcess.kill();
        if (backendProcess) backendProcess.kill();
        adminProcess.kill();
        
        rl.close();
        
        setTimeout(() => {
            console.log(chalk.red.bold('All processes stopped.'));
            process.exit(0);
        }, 1000);
    });

    console.log(chalk.magenta.bold('All services started. Press Ctrl+C to stop all processes.'));
}

// Запускаем все компоненты
startAll();
