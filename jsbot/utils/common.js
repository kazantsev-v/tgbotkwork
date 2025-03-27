const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { User, Worker, Customer } = require("../models/user");
const { Task, TaskPhoto } = require("../models/task");
const { config } = require('../config/config')
const { updateUserSceneStep } = require('./user');
const { catchAxiosError, retry } = require('./errorHandler');
const logger = require('./logger');

const backend_URL = config.backendURL;

// Загрузка метроданных с обработкой ошибок
let metroData = [];
let spbStations = [];

try {
    const metroFilePath = path.join(__dirname, '../assets/metro.json');
    if (fs.existsSync(metroFilePath)) {
        metroData = JSON.parse(fs.readFileSync(metroFilePath, 'utf8'));
        
        // Фильтруем только станции Санкт-Петербурга
        spbStations = metroData
            .filter(city => city.name === 'Санкт-Петербург')
            .flatMap(city =>
                city.lines.flatMap(line =>
                    line.stations.map(station => ({
                        id: station.id,
                        name: station.name,
                        lat: station.lat,
                        lng: station.lng,
                        lineName: line.name,
                    }))
                )
            );
        
        logger.info('Metro data loaded successfully', { stationsCount: spbStations.length });
    } else {
        logger.error('Metro data file not found', { path: metroFilePath });
    }
} catch (error) {
    logger.error('Failed to load metro data', { error });
}

const tryGetMetroStation = (station) => {
    if (!spbStations.length) {
        logger.warn('No stations data available when checking station', { stationName: station });
        return false;
    }
    return spbStations.find(s => station === s.name) ? true : false;
}

// Функция для вычисления ближайшей станции метро с обработкой ошибок
const getNearestMetroStation = (userCoords) => {
    if (!spbStations.length) {
        logger.warn('No stations data available when finding nearest station', { userCoords });
        return { name: 'Неизвестно', line: 'Неизвестно', city: 'Санкт-Петербург' };
    }
    
    try {
        let nearestStation = spbStations[0];
        let minDistance = Number.MAX_VALUE;

        spbStations.forEach(station => {
            const distance = Math.sqrt(
                Math.pow(userCoords.latitude - station.lat, 2) +
                Math.pow(userCoords.longitude - station.lng, 2)
            );
            if (distance < minDistance) {
                minDistance = distance;
                nearestStation = station;
            }
        });

        return {
            name: nearestStation.name,
            line: nearestStation.lineName,
            city: 'Санкт-Петербург',
        };
    } catch (error) {
        logger.error('Error finding nearest metro station', { userCoords, error });
        return { name: 'Неизвестно', line: 'Неизвестно', city: 'Санкт-Петербург' };
    }
};

// Функция для получения координат станции по названию с обработкой ошибок
const getStationCoordinates = (stationName) => {
    if (!spbStations.length) {
        logger.warn('No stations data available when getting coordinates', { stationName });
        return null;
    }
    
    try {
        const station = spbStations.find(station => 
            station.name.toLowerCase() === stationName.toLowerCase()
        );
        if (!station) {
            logger.warn('Station not found', { stationName });
            return null;
        }
        return { latitude: station.lat, longitude: station.lng };
    } catch (error) {
        logger.error('Error getting station coordinates', { stationName, error });
        return null;
    }
};

async function updateStep(ctx, nextStep, message, keyboard = null) {
    try {
        ctx.session.step = nextStep;
        await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
        if (keyboard) {
            await ctx.reply(message, keyboard);
        } else {
            await ctx.reply(message);
        }
        logger.debug('Updated user step', { 
            userId: ctx.from.id, 
            scene: ctx.scene.current.id, 
            step: nextStep 
        });
    } catch (error) {
        logger.error('Failed to update step', { 
            userId: ctx.from?.id, 
            scene: ctx.scene?.current?.id, 
            step: nextStep,
            error
        });
        // Пытаемся хотя бы отправить сообщение
        try {
            if (keyboard) {
                await ctx.reply(message, keyboard);
            } else {
                await ctx.reply(message);
            }
        } catch (replyError) {
            logger.error('Failed to send message after step update failure', { error: replyError });
        }
    }
}

const saveDocument = async (documentLink, documentId) => {
    try {
        logger.debug('Saving document', { documentId });
        
        // Загружаем файл из Telegram с повторными попытками
        const response = await retry(
            () => axios.get(documentLink, { responseType: 'stream' }),
            [],
            { context: 'downloadDocument', maxRetries: 3 }
        );

        // Создаем FormData и добавляем файл
        const formData = new FormData();
        formData.append('file', response.data, documentId);
        formData.append('filename', documentLink.href.split('/').pop());
        
        // Отправляем файл на сервер с повторными попытками
        const uploadResponse = await retry(
            () => axios.post(`${backend_URL}/upload`, formData, {
                headers: formData.getHeaders(),
                timeout: 15000 // Увеличиваем таймаут для загрузки файлов
            }),
            [],
            { context: 'uploadDocument', maxRetries: 3, initialDelay: 1000 }
        );

        logger.info('Document saved successfully', { 
            documentId, 
            url: uploadResponse.data.downloadUrl 
        });
        return uploadResponse.data.downloadUrl;
    } catch (error) {
        logger.error('Failed to save document', { documentId, error });
        throw new Error('Не удалось сохранить документ');
    }
}

const convertTimeToDbFormat = (hours) => {
    try {
        if (typeof hours !== 'number' || isNaN(hours)) {
            logger.warn('Invalid hours value for time conversion', { hours });
            return '00:00';
        }
        
        const totalMinutes = Math.round(hours * 60);
        const hh = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
        const mm = (totalMinutes % 60).toString().padStart(2, '0');
        return `${hh}:${mm}`;
    } catch (error) {
        logger.error('Error converting time to DB format', { hours, error });
        return '00:00'; // Возвращаем безопасное значение по умолчанию
    }
}

const createReminder = async (reminder) => {
    try {
        logger.info('Creating reminder', { reminder });
        const response = await retry(
            () => axios.post(backend_URL+'/reminders', reminder),
            [],
            { context: 'createReminder' }
        );
        logger.info('Reminder created successfully', { 
            reminderId: response.data.reminder?.id 
        });
        return response.data.reminder;
    } catch (error) {
        logger.error('Failed to create reminder', { reminder, error });
        return null;
    }
}

module.exports = {
    getNearestMetroStation, 
    getStationCoordinates,
    updateStep,
    downloadAndUploadFile: async (fileUrl) => {
        try {
            await saveDocument(fileUrl, `file_${Date.now()}`);
            logger.debug('File downloaded and uploaded', { fileUrl });
        } catch (error) {
            logger.error('Failed to download and upload file', { fileUrl, error });
        }
    },
    saveDocument,
    convertTimeToDbFormat,
    createReminder,
    tryGetMetroStation
}