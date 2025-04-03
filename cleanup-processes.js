const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

// Проверяем, запущен ли скрипт в TTY (интерактивном режиме)
const isTTY = process.stdin.isTTY;

// Параметры и флаги
const SUDO_PASSWORD = 'yD8eY9nZ4z';
const AUTO_KILL = process.argv.includes('--auto-kill');
const FORCE_NON_INTERACTIVE = process.argv.includes('--non-interactive') || !isTTY;

// Создаем интерфейс readline только если мы в интерактивном режиме
let rl = null;
if (!FORCE_NON_INTERACTIVE) {
    try {
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    } catch (error) {
        console.log(`Не удалось создать интерактивный интерфейс: ${error.message}`);
        console.log('Переключение в неинтерактивный режим');
    }
}

// Функция для логирования с отметкой времени
function log(message, isError = false) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    
    if (isError) {
        console.error(logMessage);
    } else {
        console.log(logMessage);
    }
    
    // Опционально: запись логов в файл
    try {
        const logDir = path.join(__dirname, 'logs');
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        fs.appendFileSync(
            path.join(logDir, `cleanup-${new Date().toISOString().split('T')[0]}.log`),
            logMessage + '\n'
        );
    } catch (e) {
        // Игнорируем ошибки записи в файл
    }
}

// Безопасное закрытие readline
function safeCloseReadline() {
    if (rl && typeof rl.close === 'function') {
        try {
            rl.close();
        } catch (error) {
            console.log(`Не удалось закрыть readline интерфейс: ${error.message}`);
        }
    }
}

// Функция для неинтерактивного запроса (всегда возвращает true или заданное значение)
function nonInteractivePrompt(message, defaultAnswer = true) {
    log(`[Неинтерактивный режим] ${message} Автоматический ответ: ${defaultAnswer ? 'да' : 'нет'}`);
    return Promise.resolve(defaultAnswer);
}

// Функция для интерактивного запроса
function interactivePrompt(message) {
    if (!rl) {
        return Promise.resolve(true);
    }
    
    return new Promise((resolve) => {
        rl.question(message, (answer) => {
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

// Универсальная функция запроса, которая выбирает нужный режим
function prompt(message, defaultValue = true) {
    if (FORCE_NON_INTERACTIVE || AUTO_KILL) {
        return nonInteractivePrompt(message, defaultValue);
    } else {
        return interactivePrompt(message);
    }
}

// Функция для выполнения команды как sudo с автоматическим вводом пароля
function executeSudo(command) {
    return new Promise((resolve, reject) => {
        log(`Выполнение sudo команды: ${command}`);
        
        const sudoProcess = require('child_process').spawn('sudo', ['-S'].concat(command.split(' ')), {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        // Отправляем пароль в stdin
        sudoProcess.stdin.write(SUDO_PASSWORD + '\n');
        sudoProcess.stdin.end();
        
        let output = '';
        sudoProcess.stdout.on('data', (data) => {
            output += data.toString();
        });
        
        let errorOutput = '';
        sudoProcess.stderr.on('data', (data) => {
            errorOutput += data.toString();
            // Не выводим сообщение о запросе пароля
            if (!errorOutput.includes('password')) {
                process.stderr.write(data);
            }
        });
        
        sudoProcess.on('close', (code) => {
            if (code === 0) {
                resolve(output);
            } else {
                reject(new Error(`Выполнение sudo команды завершилось с кодом ${code}: ${errorOutput}`));
            }
        });
    });
}

// Функция для поиска процессов по имени
function findProcesses(keyword) {
    return new Promise((resolve, reject) => {
        let command;
        
        // Только Linux/Unix команды
        command = `ps -eo pid,user,command | grep -v grep | grep -i "node"`;
        
        exec(command, (error, stdout) => {
            if (error) {
                // Игнорируем ошибки, которые могут возникнуть если процесс не найден
                if (error.code === 1 && stdout) {
                    // grep возвращает 1, если ничего не найдено, но это не ошибка для нас
                } else {
                    reject(error);
                    return;
                }
            }
            
            let processes = [];
            
            // Парсинг вывода ps для Linux/Unix
            const lines = stdout.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                if (parts.length >= 3) {
                    const pid = parseInt(parts[0]);
                    const user = parts[1];
                    const command = parts.slice(2).join(' ');
                    
                    processes.push({
                        pid,
                        user,
                        command
                    });
                }
            }
            
            // Фильтрация процессов по ключевому слову
            if (keyword) {
                processes = processes.filter(p => 
                    p.command.toLowerCase().includes(keyword.toLowerCase())
                );
            }
            
            resolve(processes);
        });
    });
}

// Функция для завершения процесса
async function killProcess(pid, processInfo) {
    const isCurrentUserProcess = processInfo && processInfo.user === process.env.USER;
    const needsSudo = !isCurrentUserProcess;
    
    try {
        // Linux/Mac - проверяем нужен ли sudo
        if (needsSudo) {
            try {
                // Сначала пробуем обычный kill
                await executeCommand(`kill -9 ${pid}`);
                log(`Процесс ${pid} успешно завершен`);
                return true;
            } catch (error) {
                if (error.message.includes('Operation not permitted')) {
                    log(`Недостаточно прав для завершения процесса ${pid}, используем sudo`);
                    
                    // Если включен автоматический режим, используем sudo без запроса
                    if (AUTO_KILL || FORCE_NON_INTERACTIVE) {
                        try {
                            await executeSudo(`kill -9 ${pid}`);
                            log(`Процесс ${pid} успешно завершен с sudo`);
                            return true;
                        } catch (sudoError) {
                            log(`Не удалось завершить процесс ${pid} с sudo: ${sudoError.message}`, true);
                            return false;
                        }
                    } else {
                        // Если не автоматический режим, спрашиваем пользователя
                        const userrQuestion = `Процесс ${pid} (${processInfo?.command}) принадлежит пользователю ${processInfo?.user}. Использовать sudo? (y/n): `;
                        const answer = await prompt(userrQuestion);
                        
                        if (answer) {
                            try {
                                await executeSudo(`kill -9 ${pid}`);
                                log(`Процесс ${pid} успешно завершен с sudo`);
                                return true;
                            } catch (sudoError) {
                                log(`Не удалось завершить процесс ${pid} с sudo: ${sudoError.message}`, true);
                                return false;
                            }
                        } else {
                            log(`Пропускаем процесс ${pid}`);
                            return false;
                        }
                    }
                } else {
                    throw error;
                }
            }
        } else {
            // Обычный kill для процессов текущего пользователя
            await executeCommand(`kill -9 ${pid}`);
            log(`Процесс ${pid} успешно завершен`);
            return true;
        }
    } catch (error) {
        log(`Ошибка при завершении процесса ${pid}: ${error.message}`, true);
        
        if (error.message.includes('Operation not permitted') || error.message.includes('Access is denied')) {
            log(`Недостаточно прав для завершения процесса. Команда для ручного завершения:`, true);
            log(`sudo kill -9 ${pid}`, true);
        }
        
        return false;
    }
}

// Вспомогательная функция для выполнения команды
function executeCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(new Error(`${error.message}\n${stderr}`));
                return;
            }
            resolve(stdout);
        });
    });
}

// Вспомогательная функция для получения PID процесса по порту
function getProcessIdByPort(port) {
    return new Promise((resolve, reject) => {
        const command = `lsof -i :${port} | grep LISTEN`;
        
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            
            const lines = stdout.trim().split('\n');
            if (lines.length > 0) {
                const parts = lines[0].trim().split(/\s+/);
                const pid = parts[1];
                resolve(pid);
            } else {
                resolve(null);
            }
        });
    });
}

// Основная функция очистки
async function cleanup() {
    log('Поиск и завершение "призрачных" процессов...');
    
    try {
        // Проверяем, есть ли файл с PID от предыдущего запуска
        const pidFilePath = path.join(__dirname, 'last-run-pids.json');
        if (fs.existsSync(pidFilePath)) {
            const pidInfo = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
            log(`Найдена информация о предыдущем запуске. Основной PID: ${pidInfo.mainPid}`);
            
            // Проверяем, запущен ли еще основной процесс
            try {
                process.kill(pidInfo.mainPid, 0);
                log(`Основной процесс ${pidInfo.mainPid} всё еще запущен. Пытаемся завершить...`);
                
                // Получаем информацию о процессе
                const processInfoList = await findProcesses('');
                const processInfo = processInfoList.find(p => p.pid === pidInfo.mainPid);
                
                await killProcess(pidInfo.mainPid, processInfo);
            } catch (e) {
                log(`Основной процесс ${pidInfo.mainPid} уже не запущен`);
            }
            
            // Завершаем дочерние процессы
            for (const childPid of pidInfo.children) {
                try {
                    process.kill(childPid, 0);
                    log(`Дочерний процесс ${childPid} всё еще запущен. Пытаемся завершить...`);
                    
                    // Получаем информацию о процессе
                    const processInfoList = await findProcesses('');
                    const processInfo = processInfoList.find(p => p.pid === childPid);
                    
                    await killProcess(childPid, processInfo);
                } catch (e) {
                    log(`Дочерний процесс ${childPid} уже не запущен`);
                }
            }
            
            // Удаляем файл с PID
            fs.unlinkSync(pidFilePath);
        }
        
        // Ищем процессы по ключевым словам
        log('Поиск потенциальных "призрачных" процессов бота и бэкенда...');
        
        // Проверяем start-all.js процессы
        const startAllProcesses = await findProcesses('start-all.js');
        for (const proc of startAllProcesses) {
            log(`Найден процесс start-all.js с PID ${proc.pid} (пользователь: ${proc.user}). Завершаем...`);
            await killProcess(proc.pid, proc);
        }
        
        // Проверяем jsbot/index.js процессы
        const botProcesses = await findProcesses('jsbot/index.js');
        for (const proc of botProcesses) {
            log(`Найден процесс бота с PID ${proc.pid} (пользователь: ${proc.user}). Завершаем...`);
            await killProcess(proc.pid, proc);
        }
        
        // Проверяем jsback/dist/server.js процессы
        const backendProcesses = await findProcesses('jsback/dist/server.js');
        for (const proc of backendProcesses) {
            log(`Найден процесс бэкенда с PID ${proc.pid} (пользователь: ${proc.user}). Завершаем...`);
            await killProcess(proc.pid, proc);
        }
        
        // Проверяем ng serve процессы (более тщательно)
        const ngProcesses = await findProcesses('ng serve');
        for (const proc of ngProcesses) {
            log(`Найден процесс Angular с PID ${proc.pid} (пользователь: ${proc.user}). Завершаем...`);
            await killProcess(proc.pid, proc);
        }
        
        // Дополнительная проверка процессов Angular на порту 4200
        try {
            log('Проверка процессов на порту 4200...');
            const port4200Pid = await getProcessIdByPort(4200);
            if (port4200Pid) {
                const processInfoList = await findProcesses('');
                const processInfo = processInfoList.find(p => p.pid.toString() === port4200Pid.toString());
                
                log(`Найден процесс на порту 4200 с PID ${port4200Pid} (${processInfo ? processInfo.command : 'неизвестно'}). Завершаем...`);
                await killProcess(port4200Pid, processInfo);
            }
        } catch (portError) {
            log(`Ошибка при проверке порта 4200: ${portError.message}`, true);
        }
        
        log('Очистка завершена успешно!');
    } catch (error) {
        log(`Ошибка при очистке процессов: ${error.message}`, true);
        if (error.stack) {
            log(error.stack, true);
        }
    } finally {
        // Безопасно закрываем readline
        safeCloseReadline();
        
        // Принудительно завершаем процесс после небольшой задержки
        setTimeout(() => {
            log('Завершение процесса очистки...');
            process.exit(0);
        }, 500);
    }
}

// Функция для запуска очистки с принудительным завершением при превышении таймаута
function runCleanupWithTimeout() {
    // Устанавливаем таймаут на случай, если скрипт зависнет
    const timeoutId = setTimeout(() => {
        log('Превышено максимальное время выполнения, принудительное завершение', true);
        process.exit(1);
    }, 120000); // 2 минуты максимальное время выполнения
    
    // Запускаем очистку
    cleanup().finally(() => {
        // Очищаем таймаут при любом исходе
        clearTimeout(timeoutId);
    });
}

// Экспортируем функцию для использования в других модулях
module.exports = { cleanup };

// Если файл запущен напрямую, выполняем очистку с таймаутом
if (require.main === module) {
    runCleanupWithTimeout();
}
