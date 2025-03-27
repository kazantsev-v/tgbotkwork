/**
 * Скрипт для перекомпиляции TypeScript кода бэкенда
 */
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const backendDir = path.join(__dirname, 'jsback');
console.log('Recompiling backend TypeScript code...');

// Проверяем наличие директории jsback
if (!fs.existsSync(backendDir)) {
    console.error(`❌ Backend directory not found: ${backendDir}`);
    process.exit(1);
}

// Выполняем компиляцию TypeScript
const tsc = spawn('npx', ['tsc'], {
    cwd: backendDir,
    shell: true,
    stdio: 'inherit'
});

tsc.on('close', (code) => {
    if (code === 0) {
        console.log('✅ Backend TypeScript compilation successful!');
        
        // После успешной компиляции копируем сертификаты
        console.log('\nCopying SSL certificates to compiled code directories...');
        
        const copyCerts = spawn('node', ['copy-certs.js'], {
            cwd: __dirname,
            shell: true,
            stdio: 'inherit'
        });
        
        copyCerts.on('close', (copyCode) => {
            if (copyCode === 0) {
                console.log('✅ Certificates copied successfully!');
            } else {
                console.error(`❌ Certificate copying failed with code ${copyCode}`);
            }
        });
    } else {
        console.error(`❌ TypeScript compilation failed with code ${code}`);
        process.exit(1);
    }
});
