import express, { Request, Response } from 'express';
import multer from 'multer';
import { AppDataSource } from "./database";
import path from 'path';
import { S3 } from 'aws-sdk';
import cors from 'cors';
import fs from 'fs';

import { initializeSchedules } from './services/reminder-scheduler';

import userRoutes from "./routes/userRoutes";
import taskRoutes from './routes/taskRoutes';
import reminderRoutes from './routes/reminderRoutes';
import reviewRoutes from './routes/reviewRoutes';
import config from './config';

/*const s3 = new S3({
    endpoint: 'https://storage.yandexcloud.net',    // Endpoint для Yandex Object Storage
    accessKeyId: 'ВАШ_ACCESS_KEY',                  // Ваш Access Key
    secretAccessKey: 'ВАШ_SECRET_KEY',              // Ваш Secret Key
    region: 'ru-central1',                          // Регион Yandex Cloud
});*/
const upload = multer({ dest: 'data/uploads/' });
const BASE_URL = config.self;

const app = express();
app.use(express.json());
app.use(cors({
    origin: '*', // Источник, с которого разрешены запросы
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Разрешённые методы
    credentials: true,
}));

// Добавляем middleware для логирования запросов
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    
    // Замеряем время выполнения запроса
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`);
    });
    
    next();
});

// Добавляем обработку ошибок для всех запросов
app.use((err: any, req: Request, res: Response, next: any) => {
    console.error(`[${new Date().toISOString()}] Error:`, err);
    res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// Эндпоинт для проверки здоровья системы
app.get('/api/health', async (req: Request, res: Response) => {
    try {
        res.status(200).json({ 
            status: 'ok', 
            timestamp: new Date().toISOString(),
            version: process.env.npm_package_version || 'unknown'
        });
    } catch (error) {
        console.error('Health check error:', error);
        res.status(500).json({ status: 'error', error: (error as Error).message });
    }
});

// Эндпоинт для проверки подключения к БД
app.get('/api/health/db', async (req: Request, res: Response) => {
    try {
        if (!AppDataSource.isInitialized) {
            throw new Error('Database is not initialized');
        }
        
        // Простой запрос для проверки соединения
        await AppDataSource.query('SELECT 1 as result');
        
        res.status(200).json({ 
            status: 'ok', 
            message: 'Database connection is healthy',
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Database health check error:', error);
        res.status(500).json({ 
            status: 'error', 
            message: 'Database connection failed',
            error: (error as Error).message 
        });
    }
});

// Маршрут для загрузки файла
app.post('/api/upload', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }

    const originalPath = req.file.path;
    const newFilename = req.file.filename+'__'+req.body.filename;
    const newPath = path.join(path.dirname(originalPath), newFilename);

    try {
        // Переименование файла
        fs.renameSync(originalPath, newPath);

        const downloadUrl = `${BASE_URL}/api/files/${newFilename}`;
        console.log(`File saved. Accessible at: ${downloadUrl}`);

        res.json({ message: 'File uploaded successfully', downloadUrl });
    } catch (error) {
        console.error('Error renaming file:', error);
        res.status(500).json({ error: 'Failed to save file with custom filename' });
    }

    /*
    yandex cloud approach
    const fileStream = fs.createReadStream(filePath);

    const params = {
        Bucket: bucketName,
        Key: key,
        Body: fileStream,
    };

    return s3.upload(params).promise();*/
});

// Маршрут для получения файла
app.get('/api/files/:filename', (req: Request, res: Response) => {
    const filePath = path.resolve(__dirname+'/..', 'data/uploads', req.params.filename);
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ error: 'File not found' });
        }
    });
});

// Подключение маршрутов
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/reviews", reviewRoutes);

// Запуск подключения к БД с улучшенной обработкой ошибок
let dbConnectionAttempts = 0;
const MAX_DB_CONNECTION_ATTEMPTS = 5;

function connectToDatabase() {
    dbConnectionAttempts++;
    console.log(`Attempting to connect to database (attempt ${dbConnectionAttempts}/${MAX_DB_CONNECTION_ATTEMPTS})...`);
    
    AppDataSource.initialize()
        .then(() => {
            console.log("Database connected successfully");
            initializeSchedules();
        })
        .catch((err) => {
            console.error(`Database connection error (attempt ${dbConnectionAttempts}/${MAX_DB_CONNECTION_ATTEMPTS}):`, err);
            
            if (dbConnectionAttempts < MAX_DB_CONNECTION_ATTEMPTS) {
                const timeout = Math.min(1000 * Math.pow(2, dbConnectionAttempts), 30000);
                console.log(`Retrying in ${timeout/1000} seconds...`);
                setTimeout(connectToDatabase, timeout);
            } else {
                console.error(`Failed to connect to database after ${MAX_DB_CONNECTION_ATTEMPTS} attempts`);
                // Продолжаем работу даже без базы данных, чтобы API хотя бы частично функционировал
            }
        });
}

// Запускаем подключение к БД
connectToDatabase();

export default app;
