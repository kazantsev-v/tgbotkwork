/**
 * Скрипт для генерации самоподписанных SSL-сертификатов
 * для локальной разработки
 * 
 * Запуск: node generate-certs.js
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Пути к файлам сертификатов
const CERT_PATH = path.join(__dirname, 'cert.pem');
const KEY_PATH = path.join(__dirname, 'privkey.pem');

// Проверка наличия сертификатов
if (fs.existsSync(CERT_PATH) && fs.existsSync(KEY_PATH)) {
    console.log('SSL certificates already exist:');
    console.log(`- Certificate: ${CERT_PATH}`);
    console.log(`- Private key: ${KEY_PATH}`);
    console.log('\nIf you want to regenerate them, delete these files first.\n');
    process.exit(0);
}

console.log('Generating self-signed SSL certificates...');

// Команда для генерации самоподписанных сертификатов с помощью OpenSSL
const command = 'openssl req -x509 -newkey rsa:4096 -keyout privkey.pem -out cert.pem -days 365 -nodes -subj "/CN=localhost"';

// Выполнение команды
exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error executing OpenSSL command: ${error.message}`);
        console.log('\nMake sure OpenSSL is installed on your system.');
        console.log('You can download it from: https://www.openssl.org/');
        console.log('\nAlternatively, you can generate certificates manually and place them in the project root.\n');
        process.exit(1);
    }
    
    if (stderr) {
        console.log('OpenSSL output:');
        console.log(stderr);
    }
    
    console.log('\nSSL certificates generated successfully:');
    console.log(`- Certificate: ${CERT_PATH}`);
    console.log(`- Private key: ${KEY_PATH}`);
    console.log('\nThese are self-signed certificates for development use only.');
    console.log('For production, you should use properly signed certificates from a trusted CA.\n');
});
