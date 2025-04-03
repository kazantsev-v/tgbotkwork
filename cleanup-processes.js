const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const isWindows = process.platform === 'win32';
const isLinux = process.platform === 'linux';
const isMac = process.platform === 'darwin';

// Предустановленный пароль для sudo
const SUDO_PASSWORD = 'yD8eY9nZ4z';
const AUTO_KILL = process.argv.includes('--auto-kill');

// Создаем интерфейс для чтения ввода пользователя
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

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
                    if (AUTO_KILL) {
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
                        return new Promise((resolve) => {
                            rl.question(`Процесс ${pid} (${processInfo?.command}) принадлежит пользователю ${processInfo?.user}. Использовать sudo? (y/n): `, async (answer) => {
                                if (answer.toLowerCase() === 'y') {
                                    try {
                                        await executeSudo(`kill -9 ${pid}`);
                                        log(`Процесс ${pid} успешно завершен с sudo`);
                                        resolve(true);
                                    } catch (sudoError) {
                                        log(`Не удалось завершить процесс ${pid} с sudo: ${sudoError.message}`, true);
                                        resolve(false);
                                    }
                                } else {
                                    log(`Пропускаем процесс ${pid}`);
                                    resolve(false);
                                }
                            });
                        });
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
        rl.close();
    }
}

// Экспортируем функцию для использования в других модулях
module.exports = { cleanup };

// Если файл запущен напрямую, выполняем очистку
if (require.main === module) {
    cleanup();
}
