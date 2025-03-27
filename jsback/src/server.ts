import app from './app';
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';

const PORT = process.env.PORT || 3003;

// Функция для создания HTTP или HTTPS сервера
function createServer() {
    // Проверяем наличие SSL-сертификатов в папке admin-panel
    const adminPanelPath = path.resolve(__dirname, '../../admin-panel');
    const certPath = path.join(adminPanelPath, 'cert.pem');
    const keyPath = path.join(adminPanelPath, 'privkey.pem');
    
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);
    
    if (useHttps) {
        try {
            const privateKey = fs.readFileSync(keyPath, 'utf8');
            const certificate = fs.readFileSync(certPath, 'utf8');
            
            const credentials = { key: privateKey, cert: certificate };
            
            console.log('SSL certificates found in admin-panel folder, starting HTTPS server');
            return https.createServer(credentials, app).listen(PORT, () => {
                console.log(`HTTPS server running on port ${PORT}`);
            });
        } catch (error) {
            console.error('Error loading SSL certificates:', error);
            console.log('Falling back to HTTP server');
        }
    }
    
    // Если сертификаты не найдены или возникла ошибка при их загрузке,
    // запускаем HTTP сервер
    console.log('Starting HTTP server (no SSL certificates)');
    return http.createServer(app).listen(PORT, () => {
        console.log(`HTTP server running on port ${PORT}`);
    });
}

// Создаем и запускаем сервер
const server = createServer();

// Обработка сигналов для корректного завершения
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing server');
    server.close(() => {
        console.log('Server closed');
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT signal received: closing server');
    server.close(() => {
        console.log('Server closed');
    });
});

export default server;
