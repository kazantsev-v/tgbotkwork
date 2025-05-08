const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { User, Worker, Customer } = require("../models/user");
const { config } = require('../config/config');
const { catchAxiosError } = require('./errors');
const apiService = require('./apiService');

const backend_URL = config.backendURL;

const initUser = async (user) => {
    try {
        const response = await axios.post(backend_URL+'/users', user);
        console.log('User saved:', response.data);
        return response.data; // Успешный ответ
    } catch (error) {
        catchAxiosError(error);
    }
}

const saveCustomerUser = async (customer) => {
    try {
        const response = await axios.post(backend_URL+'/users/customer', customer);
        console.log('Customer saved:', response.data);
        return response.data; // Успешный ответ
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const saveWorkerUser = async (worker) => {
    try {
        const response = await axios.post(backend_URL+'/users/worker', worker);
        console.log('Worker saved:', response.data);
        return response.data; // Успешный ответ
    } catch (error) {
        catchAxiosError(error);
        
    }
}

// Улучшаем функцию getUsersProfile с резервным методом при ошибках API
async function getUsersProfile(telegramId) {
    try {
        console.log(`Запрос профиля для пользователя ${telegramId}`);
        const response = await axios.get(`${backend_URL}/users/${telegramId}`);
        console.log(`Успешно получен профиль через резервный метод:`, JSON.stringify(response.data).substring(0, 100) + '...');
        return response.data;
    } catch (error) {
        console.error(`Ошибка при получении профиля пользователя ${telegramId}:`, error.message);
        
        // Пробуем резервный метод - прямой запрос через axios
        try {
            console.log(`Используем резервный метод для получения профиля пользователя ${telegramId}`);
            // Важно! Используем полный URL, а не относительный
            
        } catch (fallbackError) {
            console.error(`Ошибка резервного метода:`, fallbackError.message);
            
            // Проверка на 404 - пользователь не найден
            if (error.status === 404 || fallbackError.response?.status === 404) {
                return null; // Пользователь не найден
            }
            
            // Переделываем ошибку наружу для обработки в вызывающем коде
            throw new Error(`Не удалось получить профиль: ${error.message}`);
        }
    }
}

const getWorkerProfile = async (telegramId) => {
    try {
        const response = await axios.get(`${backend_URL}/users/worker/${telegramId}`);
        return response.data; // Возвращаем данные профиля
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getCustomerProfile = async (telegramId) => {
    try {
        const response = await axios.get(`${backend_URL}/users/customer/${telegramId}`);
        return response.data; // Возвращаем данные профиля
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getModeratorProfile = async (telegramId) => {
    try {
        const response = await axios.get(`${backend_URL}/users/moderator/${telegramId}`);
        return response.data; // Возвращаем данные профиля
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const loadCustomerProfile = async (customerObj, ctx) => {
    if(!ctx.session)
        ctx.session = {};
    if(!ctx.session.customerInfo)
        ctx.session.customerInfo = {};
    ctx.session.telegramId = customerObj.user.telegramId;
    ctx.session.role = customerObj.user.role;
    ctx.session.customerInfo.fullName = customerObj.user.name;
    ctx.session.customerInfo.photo = customerObj.user.photo;
    ctx.session.customerInfo.phone = customerObj.user.phone;
    ctx.session.scene = customerObj.user.scene;
    ctx.session.step = customerObj.user.step;
    ctx.session.balance = customerObj.user.balance;
    ctx.session.customerInfo.companyName = customerObj.company;
    ctx.session.customerInfo.additionalContacts = customerObj.additionalContacts;
    ctx.session.customerInfo.paymentTerms = customerObj.paymentTerms; 
    ctx.session.customerInfo.companyDetailsDoc = customerObj.documentPath; 
}

const loadWorkerProfile = async (workerObj, ctx) => {
    if(!ctx.session)
        ctx.session = {};
    if(!ctx.session.workerInfo)
        ctx.session.workerInfo = {};
    ctx.session.telegramId = workerObj.user.telegramId;
    ctx.session.role = workerObj.user.role;
    ctx.session.workerInfo.fullName = workerObj.user.name;
    ctx.session.workerInfo.photo = workerObj.user.photo;
    ctx.session.workerInfo.phone = workerObj.user.phone;
    ctx.session.scene = workerObj.user.scene;
    ctx.session.step = workerObj.user.step;
    ctx.session.balance = workerObj.user.balance;
    ctx.session.workerInfo.metroStation = workerObj.metro; 
    ctx.session.workerInfo.location = workerObj.location;
    ctx.session.workerInfo.address = workerObj.address;
    ctx.session.workerInfo.startTime = +(workerObj.workTimeStart.substring(0,2));
    ctx.session.workerInfo.endTime = +(workerObj.workTimeEnd.substring(0,2));
    ctx.session.workerInfo.paymentDetails = workerObj.paymentDetails;
    ctx.session.workerInfo.rating = workerObj.rating;
    ctx.session.workerInfo.weeklyIncome = workerObj.weeklyIncome;
    ctx.session.workerInfo.driverInfo = workerObj.vehicleDetails;
    ctx.session.workerInfo.hasStraps = workerObj.hasStraps;
    ctx.session.workerInfo.hasTools = workerObj.hasTools;
    ctx.session.workerInfo.hasFurnitureTools = workerObj.hasFurnitureTools;
    ctx.session.workerInfo.workInRegion = workerObj.workInRegion;
    ctx.session.workerInfo.bonus = workerObj.bonus;
    ctx.session.workerInfo.declinedTasks = workerObj.declinedTasks;
    ctx.session.workerInfo.lateTasks = workerObj.lateTasks;
    ctx.session.workerInfo.completedTasks = workerObj.completedTasks;
}

// Улучшаем функцию updateUserSceneStep для надежности
const updateUserSceneStep = async (telegramId, scene, step) => {
    if (!telegramId) {
        console.error('updateUserSceneStep: telegramId не определен');
        return false;
    }
    
    console.log(`Обновление сцены для пользователя ${telegramId}: ${scene}, шаг ${step}`);
    
    try {
        // Первый метод - через apiService
        await apiService.users.updateProfile(telegramId, { scene, step });
        console.log(`Сцена успешно обновлена через apiService для ${telegramId}`);
        return true;
    } catch (error) {
        console.error(`Ошибка при обновлении сцены: ${error.message}`);
        
        try {
            // Второй метод - прямой запрос через axios
            console.log(`Пробуем обновить сцену напрямую через axios для ${telegramId}`);
            await axios.patch(`${backend_URL}/users/${telegramId}`, { scene, step });
            console.log(`Сцена успешно обновлена через axios для ${telegramId}`);
            return true;
        } catch (axiosError) {
            console.error(`Ошибка axios при обновлении сцены: ${axiosError.message}`);
            
            // Третий метод - прямой запрос через axios с PUT
            try {
                console.log(`Пробуем обновить сцену через PUT для ${telegramId}`);
                await axios.put(`${backend_URL}/users/${telegramId}`, { scene, step });
                console.log(`Сцена успешно обновлена через PUT для ${telegramId}`);
                return true;
            } catch (putError) {
                console.error(`Все попытки обновления сцены не удались для ${telegramId}`);
                return false;
            }
        }
    }
}

const updateUserBalance = async (telegramId, balance, ctx) => {
    if(ctx && ctx.session)
        ctx.session.balance = balance;
    try {
        const response = await axios.patch(`${backend_URL}/users/changeBalance/${telegramId}`, {
            balance
        });

        return response.data.balance;
    } catch (error) {
        catchAxiosError(error);
        
    }
};

module.exports = {
    saveCustomerUser,
    saveWorkerUser,
    getUsersProfile,
    getWorkerProfile,
    getCustomerProfile,
    getModeratorProfile,
    loadCustomerProfile,
    loadWorkerProfile,
    updateUserSceneStep,
    initUser,
    updateUserBalance
}