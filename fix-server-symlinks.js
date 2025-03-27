/**
 * Скрипт для создания символических ссылок на сертификаты 
 * в директории, где их ищет скомпилированный сервер
 */
const fs = require('fs');
const path = require('path');

// Пути к исходным сертификатам
const adminPanelPath = path.join(__dirname, 'admin-panel');
const sourceCertPath = path.join(adminPanelPath, 'cert.pem');
const sourceKeyPath = path.join(adminPanelPath, 'privkey.pem');

// Путь, относительно которого сервер ищет сертификаты
const serverDir = path.join(__dirname, 'jsback/dist');
const parentDir = path.dirname(serverDir);

// Пути назначения в директории, где сервер будет искать сертификаты
const destCertPath = path.join(parentDir, 'cert.pem');
const destKeyPath = path.join(parentDir, 'privkey.pem');

try {
    // Проверяем существование исходных файлов
    if (!fs.existsSync(sourceCertPath) || !fs.existsSync(sourceKeyPath)) {
        throw new Error(`Source certificates not found in ${adminPanelPath}`);
    }
    
    // Создаем или перезаписываем сертификаты в целевой директории
    console.log(`Copying certificates to ${parentDir}...`);
    
    fs.copyFileSync(sourceCertPath, destCertPath);
    console.log(`✅ Certificate copied to: ${destCertPath}`);
    
    fs.copyFileSync(sourceKeyPath, destKeyPath);
    console.log(`✅ Private key copied to: ${destKeyPath}`);
    
    console.log('\n✅ Temporary fix applied successfully!');
    console.log('Server should now be able to find the certificates.');
} catch (error) {
    console.error(`❌ Error applying temporary fix: ${error.message}`);
    process.exit(1);
}
