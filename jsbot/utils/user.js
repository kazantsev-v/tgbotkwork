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

// Восстанавливаем функцию getUsersProfile
async function getUsersProfile(telegramId) {
    try {
        const profile = await apiService.users.getProfile(telegramId);
        return profile;
    } catch (error) {
        console.error(`Ошибка при получении профиля пользователя ${telegramId}:`, error.message);
        
        // Резервный метод через axios
        try {
            console.log(`Пробуем получить профиль через прямой axios-запрос`);
            const response = await axios.get(`${backend_URL}/users/${telegramId}`);
            return response.data;
        } catch (axiosError) {
            // Если и это не сработало, проверяем ошибку 404
            if (error.status === 404 || axiosError.response?.status === 404) {
                return null; // Пользователь не найден
            }
            
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

// Восстанавливаем оригинальную функцию updateUserSceneStep
const updateUserSceneStep = async (telegramId, scene, step) => {
    try {
        // Проверяем параметры
        if (!telegramId) {
            console.error('updateUserSceneStep: telegramId не определен');
            return false;
        }
        
        console.log(`Обновление сцены для пользователя ${telegramId}: ${scene}, шаг ${step}`);
        
        // Стандартный метод через API-сервис
        await apiService.users.updateProfile(telegramId, { scene, step });
        return true;
    } catch (error) {
        console.error(`Ошибка при обновлении сцены пользователя ${telegramId}:`, error.message);
        
        // Резервный метод через прямой axios-запрос
        try {
            await axios.patch(`${backend_URL}/users/${telegramId}`, { scene, step });
            console.log(`Успешно обновлена сцена через прямой axios-запрос`);
            return true;
        } catch (fallbackError) {
            console.error(`Все попытки обновления сцены не удались:`, fallbackError.message);
            return false;
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