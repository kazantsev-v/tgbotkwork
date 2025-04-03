const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

// Функция для поиска процессов по имени
function findProcesses(keyword) {
    return new Promise((resolve, reject) => {
        const command = isWindows
            ? `tasklist /FI "IMAGENAME eq node.exe" /FO CSV`
            : `ps aux | grep -v grep | grep -i "node"`;
        
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            
            let processes = [];
            
            if (isWindows) {
                // Парсинг вывода tasklist
                const lines = stdout.trim().split('\n');
                // Пропускаем заголовок
                for (let i = 1; i < lines.length; i++) {
                    const parts = lines[i].replace(/"/g, '').split(',');
                    if (parts.length >= 2) {
                        const pid = parseInt(parts[1]);
                        processes.push({
                            pid,
                            command: parts[0]
                        });
                    }
                }
            } else {
                // Парсинг вывода ps для Linux/Unix
                const lines = stdout.trim().split('\n');
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    if (parts.length >= 2) {
                        const pid = parseInt(parts[1]);
                        processes.push({
                            pid,
                            command: line
                        });
                    }
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
function killProcess(pid) {
    return new Promise((resolve, reject) => {
        const command = isWindows
            ? `taskkill /F /PID ${pid}`
            : `kill -9 ${pid}`;
            
        exec(command, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }
            console.log(`Процесс ${pid} успешно завершен`);
            resolve(true);
        });
    });
}

// Основная функция очистки
async function cleanup() {
    console.log('Поиск и завершение "призрачных" процессов...');
    
    try {
        // Проверяем, есть ли файл с PID от предыдущего запуска
        const pidFilePath = path.join(__dirname, 'last-run-pids.json');
        if (fs.existsSync(pidFilePath)) {
            const pidInfo = JSON.parse(fs.readFileSync(pidFilePath, 'utf8'));
            console.log(`Найдена информация о предыдущем запуске. Основной PID: ${pidInfo.mainPid}`);
            
            // Проверяем, запущен ли еще основной процесс
            try {
                process.kill(pidInfo.mainPid, 0);
                console.log(`Основной процесс ${pidInfo.mainPid} всё еще запущен. Пытаемся завершить...`);
                await killProcess(pidInfo.mainPid);
            } catch (e) {
                console.log(`Основной процесс ${pidInfo.mainPid} уже не запущен`);
            }
            
            // Завершаем дочерние процессы
            for (const childPid of pidInfo.children) {
                try {
                    process.kill(childPid, 0);
                    console.log(`Дочерний процесс ${childPid} всё еще запущен. Пытаемся завершить...`);
                    await killProcess(childPid);
                } catch (e) {
                    console.log(`Дочерний процесс ${childPid} уже не запущен`);
                }
            }
            
            // Удаляем файл с PID
            fs.unlinkSync(pidFilePath);
        }
        
        // Ищем процессы по ключевым словам
        console.log('Поиск потенциальных "призрачных" процессов бота и бэкенда...');
        
        // Проверяем start-all.js процессы
        const startAllProcesses = await findProcesses('start-all.js');
        for (const proc of startAllProcesses) {
            console.log(`Найден процесс start-all.js с PID ${proc.pid}. Завершаем...`);
            await killProcess(proc.pid);
        }
        
        // Проверяем jsbot/index.js процессы
        const botProcesses = await findProcesses('jsbot/index.js');
        for (const proc of botProcesses) {
            console.log(`Найден процесс бота с PID ${proc.pid}. Завершаем...`);
            await killProcess(proc.pid);
        }
        
        // Проверяем jsback/dist/server.js процессы
        const backendProcesses = await findProcesses('jsback/dist/server.js');
        for (const proc of backendProcesses) {
            console.log(`Найден процесс бэкенда с PID ${proc.pid}. Завершаем...`);
            await killProcess(proc.pid);
        }
        
        // Проверяем ng serve процессы
        const ngProcesses = await findProcesses('ng serve');
        for (const proc of ngProcesses) {
            console.log(`Найден процесс Angular с PID ${proc.pid}. Завершаем...`);
            await killProcess(proc.pid);
        }
        
        console.log('Очистка завершена успешно!');
    } catch (error) {
        console.error('Ошибка при очистке процессов:', error);
    }
}

// Запуск очистки
cleanup();
