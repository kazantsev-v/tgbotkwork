const { spawn } = require('child_process');
const path = require('path');
const chalk = require('chalk');

// Пути к директориям проекта
const ROOT_DIR = __dirname;
const JSBOT_DIR = path.join(ROOT_DIR, 'jsbot');
const JSBACK_DIST_DIR = path.join(ROOT_DIR, 'jsback', 'dist');
const ADMIN_PANEL_DIR = path.join(ROOT_DIR, 'admin-panel');

// Функция для запуска процесса с цветным выводом логов
function startProcess(command, args, cwd, name, color) {
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
    });

    process.on('close', (code) => {
        console.log(chalk[color].bold(`[${name}] Process exited with code ${code}`));
    });

    return process;
}

// Запуск телеграм бота
const botProcess = startProcess(
    'node', 
    ['index.js'], 
    JSBOT_DIR, 
    'TG Bot', 
    'blue'
);

// Запуск бэкенда
const backendProcess = startProcess(
    'node', 
    ['server.js'], 
    JSBACK_DIST_DIR, 
    'Backend', 
    'green'
);

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
    backendProcess.kill();
    adminProcess.kill();
    
    setTimeout(() => {
        console.log(chalk.red.bold('All processes stopped.'));
        process.exit(0);
    }, 1000);
});

console.log(chalk.magenta.bold('All services started. Press Ctrl+C to stop all processes.'));
