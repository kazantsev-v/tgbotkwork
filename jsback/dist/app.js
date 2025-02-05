"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const database_1 = require("./database");
const path_1 = __importDefault(require("path"));
const cors_1 = __importDefault(require("cors"));
const fs_1 = __importDefault(require("fs"));
const reminder_scheduler_1 = require("./services/reminder-scheduler");
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const reminderRoutes_1 = __importDefault(require("./routes/reminderRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const config_1 = __importDefault(require("./config"));
/*const s3 = new S3({
    endpoint: 'https://storage.yandexcloud.net',    // Endpoint для Yandex Object Storage
    accessKeyId: 'ВАШ_ACCESS_KEY',                  // Ваш Access Key
    secretAccessKey: 'ВАШ_SECRET_KEY',              // Ваш Secret Key
    region: 'ru-central1',                          // Регион Yandex Cloud
});*/
const upload = (0, multer_1.default)({ dest: 'data/uploads/' });
const BASE_URL = config_1.default.self;
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use((0, cors_1.default)({
    origin: '*', // Источник, с которого разрешены запросы
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], // Разрешённые методы
    credentials: true,
}));
// Маршрут для загрузки файла
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
    }
    const originalPath = req.file.path;
    const newFilename = req.file.filename + '__' + req.body.filename;
    const newPath = path_1.default.join(path_1.default.dirname(originalPath), newFilename);
    try {
        // Переименование файла
        fs_1.default.renameSync(originalPath, newPath);
        const downloadUrl = `${BASE_URL}/api/files/${newFilename}`;
        console.log(`File saved. Accessible at: ${downloadUrl}`);
        res.json({ message: 'File uploaded successfully', downloadUrl });
    }
    catch (error) {
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
app.get('/api/files/:filename', (req, res) => {
    const filePath = path_1.default.resolve(process.cwd() + '/..', 'data/uploads', req.params.filename);
    console.log(filePath)
    res.sendFile(filePath, (err) => {
        if (err) {
            res.status(404).json({ error: 'File not found' });
        }
    });
});
// Подключение маршрутов
app.use("/api/users", userRoutes_1.default);
app.use("/api/tasks", taskRoutes_1.default);
app.use("/api/reminders", reminderRoutes_1.default);
app.use("/api/reviews", reviewRoutes_1.default);
// Запуск подключения к БД
database_1.AppDataSource.initialize()
    .then(() => {
    console.log("Database connected");
    (0, reminder_scheduler_1.initializeSchedules)();
})
    .catch((err) => {
    console.error("Database connection error", err);
});
exports.default = app;
