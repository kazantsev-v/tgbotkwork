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
  }))

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

// Запуск подключения к БД
AppDataSource.initialize()
    .then(() => {
        console.log("Database connected");
        initializeSchedules();
    })
    .catch((err) => {
        console.error("Database connection error", err);
    });

export default app;
