/**
 * Скрипт для копирования SSL сертификатов из папки admin-panel
 * во все необходимые директории проекта
 * 
 * Запуск: node copy-certs.js
 */

const fs = require('fs');
const path = require('path');

// Пути к исходным сертификатам в папке admin-panel
const adminPanelPath = path.join(__dirname, 'admin-panel');
const sourceCertPath = path.join(adminPanelPath, 'cert.pem');
const sourceKeyPath = path.join(adminPanelPath, 'privkey.pem');

// Проверка существования исходных файлов
if (!fs.existsSync(sourceCertPath) || !fs.existsSync(sourceKeyPath)) {
    console.error('Error: SSL certificates not found in admin-panel folder!');
    console.log(`Expected locations:`);
    console.log(`- ${sourceCertPath}`);
    console.log(`- ${sourceKeyPath}`);
    process.exit(1);
}

// Целевые директории для копирования сертификатов
const targetDirs = [
    __dirname, // корневая директория
    path.join(__dirname, 'jsbot'), // директория бота
    path.join(__dirname, 'jsback'), // директория бэкенда
];

// Копирование сертификатов во все целевые директории
try {
    let successCount = 0;
    
    for (const dir of targetDirs) {
        const destCertPath = path.join(dir, 'cert.pem');
        const destKeyPath = path.join(dir, 'privkey.pem');
        
        try {
            // Копируем сертификат
            fs.copyFileSync(sourceCertPath, destCertPath);
            
            // Копируем приватный ключ
            fs.copyFileSync(sourceKeyPath, destKeyPath);
            
            console.log(`✅ Certificates copied to: ${dir}`);
            successCount++;
        } catch (dirError) {
            console.warn(`⚠️ Could not copy certificates to ${dir}: ${dirError.message}`);
        }
    }
    
    if (successCount > 0) {
        console.log(`\n✅ SSL certificates copied to ${successCount} directories!`);
    } else {
        throw new Error('Could not copy certificates to any directory');
    }
} catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
}
