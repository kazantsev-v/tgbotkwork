/**
 * Скрипт для установки зависимостей всех компонентов системы
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Пути к папкам с package.json
const paths = [
    '.', // корневая папка
    'jsbot', 
    'jsback',
    'admin-panel'
];

// Функция для выполнения команды
async function executeCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        console.log(`\nExecuting ${command} ${args.join(' ')} in ${cwd}`);
        
        const proc = spawn(command, args, {
            cwd,
            stdio: 'inherit',
            shell: true
        });
        
        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command failed with code ${code}`));
            }
        });
        
        proc.on('error', (err) => {
            reject(err);
        });
    });
}

// Асинхронная функция для установки зависимостей
async function installDependencies() {
    try {
        for (const relativePath of paths) {
            const dirPath = path.resolve(__dirname, relativePath);
            const packageJsonPath = path.join(dirPath, 'package.json');
            
            // Проверяем, существует ли package.json
            if (fs.existsSync(packageJsonPath)) {
                console.log(`\n=== Installing dependencies in ${relativePath} ===`);
                await executeCommand('npm', ['install'], dirPath);
                console.log(`✅ Dependencies installed successfully in ${relativePath}`);
            } else {
                console.log(`⚠️ No package.json found in ${relativePath}, skipping...`);
            }
        }
        
        console.log('\n✅ All dependencies installed successfully!');
    } catch (error) {
        console.error(`\n❌ Error installing dependencies: ${error.message}`);
        process.exit(1);
    }
}

// Запускаем установку зависимостей
installDependencies();
