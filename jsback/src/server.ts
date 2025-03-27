import app from './app';
import fs from 'fs';
import https from 'https';
import http from 'http';
import path from 'path';

const PORT = process.env.PORT || 3003;

// Функция для создания HTTP или HTTPS сервера
function createServer() {
    // Проверяем все возможные места расположения SSL-сертификатов
    const possiblePaths = [
        // Путь относительно текущей директории
        { 
            cert: path.resolve(__dirname, 'cert.pem'),
            key: path.resolve(__dirname, 'privkey.pem')
        },
        // Путь в родительской директории
        { 
            cert: path.resolve(__dirname, '../cert.pem'),
            key: path.resolve(__dirname, '../privkey.pem')
        },
        // Путь в корне проекта (на два уровня выше)
        { 
            cert: path.resolve(__dirname, '../../cert.pem'),
            key: path.resolve(__dirname, '../../privkey.pem')
        },
        // Путь в директории admin-panel
        { 
            cert: path.resolve(__dirname, '../../admin-panel/cert.pem'),
            key: path.resolve(__dirname, '../../admin-panel/privkey.pem')
        }
    ];
    
    // Ищем первый существующий путь
    for (const paths of possiblePaths) {
        const certExists = fs.existsSync(paths.cert);
        const keyExists = fs.existsSync(paths.key);
        
        if (certExists && keyExists) {
            try {
                console.log(`Found SSL certificates at: ${paths.cert} and ${paths.key}`);
                const privateKey = fs.readFileSync(paths.key, 'utf8');
                const certificate = fs.readFileSync(paths.cert, 'utf8');
                
                const credentials = { key: privateKey, cert: certificate };
                
                console.log('Starting HTTPS server');
                return https.createServer(credentials, app).listen(PORT, () => {
                    console.log(`HTTPS server running on port ${PORT}`);
                });
            } catch (error) {
                console.error('Error loading SSL certificates:', error);
                console.log('Trying next path...');
            }
        }
    }
    
    // Если сертификаты не найдены или возникла ошибка при их загрузке,
    // запускаем HTTP сервер
    console.log('No valid SSL certificates found. Starting HTTP server instead');
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
