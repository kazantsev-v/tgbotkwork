const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { User, Worker, Customer } = require("../models/user");
const { Task, TaskPhoto } = require("../models/task");
const { config } = require('../config/config');
const apiService = require('./apiService');
const { updateUserSceneStep } = require('./user');
const { catchAxiosError } = require('./errors');

const backend_URL = config.backendURL;

// Загрузка данных из metro.json
const metroData = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../assets/metro.json'), 'utf8')
);

// Фильтруем только станции Санкт-Петербурга
const spbStations = metroData
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

const tryGetMetroStation = (station) => {
    return spbStations.find(s => station === s.name)?true:false;
}

// Функция для вычисления ближайшей станции метро
const getNearestMetroStation = (userCoords) => {
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
        city: nearestStation.cityName,
    };
};

// Функция для получения координат станции по названию
const getStationCoordinates = (stationName) => {
    const station = spbStations.find(station => station.name.toLowerCase() === stationName.toLowerCase());
    if (!station) {
        return null;
    }
    return { latitude: station.lat, longitude: station.lng };
};

async function updateStep(ctx, nextStep, message, keyboard = null) {
    ctx.session.step = nextStep;
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    if (keyboard) {
        await ctx.reply(message, keyboard);
    } else {
        await ctx.reply(message);
    }
}

const downloadAndUploadFile = async (fileUrl) => {
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    const formData = new FormData();
    formData.append('document', response.data, 'uploaded_file');

    await axios.post(backend_URL + '/upload', formData, {
        headers: {
            ...formData.getHeaders(),
        },
    });
};

const saveDocument = async (documentLink, documentId) => {
    try {
        // Загружаем файл из Telegram
        const response = await axios.get(documentLink, { responseType: 'stream' });

        // Создаем FormData и добавляем файл
        const formData = new FormData();
        formData.append('file', response.data, documentId);
        formData.append('filename', documentLink.href.split('/').pop());
        // Отправляем файл на сервер
        const uploadResponse = await axios.post(`${backend_URL}/upload`, formData, {
            headers: formData.getHeaders(),
        });

        return uploadResponse.data.downloadUrl;
    } catch (error) {
        console.error('Ошибка при сохранении документа:', error);
        throw new Error('Не удалось сохранить документ');
    }
}

const convertTimeToDbFormat = (hours) => {
    const totalMinutes = Math.round(hours * 60);
    const hh = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
    const mm = (totalMinutes % 60).toString().padStart(2, '0');
    return `${hh}:${mm}`;
}

const createReminder = async (reminder) => {
    try {
        console.log('Создание напоминания:', reminder);
        // Используем apiService вместо прямого вызова axios
        const result = await apiService.post('reminders', reminder);
        console.log('Reminder saved:', result);
        return result;
    } catch (error) {
        // Подробный лог ошибки для диагностики
        console.error('Error saving reminder:', error.message);
        // Возвращаем объект с информацией об ошибке вместо undefined
        return { error: true, message: error.message };
    }
}

// Добавляем функцию для получения напоминаний
const getReminders = async (userId) => {
    try {
        // Используем apiService вместо прямого вызова axios
        const result = await apiService.get(`reminders`, { userId });
        return result.reminders;
    } catch (error) {
        console.error('Error fetching reminders:', error.message);
        throw new Error('Не удалось загрузить напоминания');
    }
}

module.exports = {
    getNearestMetroStation, 
    getStationCoordinates,
    updateStep,
    downloadAndUploadFile,
    saveDocument,
    convertTimeToDbFormat,
    createReminder,
    tryGetMetroStation,
    getReminders
}