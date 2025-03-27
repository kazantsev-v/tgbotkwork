/**
 * Скрипт для копирования SSL сертификатов из папки admin-panel
 * в корневую директорию проекта, чтобы сделать их доступными для всех компонентов
 * 
 * Запуск: node copy-certs.js
 */

const fs = require('fs');
const path = require('path');

// Пути к исходным сертификатам в папке admin-panel
const adminPanelPath = path.join(__dirname, 'admin-panel');
const sourceCertPath = path.join(adminPanelPath, 'cert.pem');
const sourceKeyPath = path.join(adminPanelPath, 'privkey.pem');

// Пути назначения в корневой директории
const destCertPath = path.join(__dirname, 'cert.pem');
const destKeyPath = path.join(__dirname, 'privkey.pem');

// Проверка существования исходных файлов
if (!fs.existsSync(sourceCertPath) || !fs.existsSync(sourceKeyPath)) {
    console.error('Error: SSL certificates not found in admin-panel folder!');
    console.log(`Expected locations:`);
    console.log(`- ${sourceCertPath}`);
    console.log(`- ${sourceKeyPath}`);
    process.exit(1);
}

// Копирование сертификатов
try {
    // Копируем сертификат
    fs.copyFileSync(sourceCertPath, destCertPath);
    console.log(`✅ Certificate copied to: ${destCertPath}`);
    
    // Копируем приватный ключ
    fs.copyFileSync(sourceKeyPath, destKeyPath);
    console.log(`✅ Private key copied to: ${destKeyPath}`);
    
    console.log('\nSSL certificates are now available in the root directory!');
} catch (error) {
    console.error(`❌ Error copying certificates: ${error.message}`);
    process.exit(1);
}
