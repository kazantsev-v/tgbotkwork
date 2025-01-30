const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');
const { Task, TaskPhoto } = require("../models/task");

const { config } = require('../config/config')
const { 
    convertTimeToDbFormat,
    saveDocument,
} = require('../utils/common');
const { catchAxiosError } = require('./errors');
const backend_URL = config.backendURL;

const createTask = async (creator, task) => {
    let taskObj = new Task(
        null, 
        creator, 
        null, 
        null, 
        task.title,
        task.description,
        task.location,
        task.payment,
        task.pack,
        task.tool,
        task.assemble,
        task.pack_description,
        task.tool_description,
        task.assemble_description,
        task.moderator_description,
        task.status,
        task.created_at,
        task.dates,
        task.duration,
        convertTimeToDbFormat(task.time)
    );
    try {
        console.log(taskObj);
        const response = await axios.post(backend_URL+'/tasks', taskObj);
        console.log('Task saved:', response.data);
        return response.data.task; // Успешный ответ
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const uploadTaskPhotos = async (ctx, taskId, photos) => {
    for(let photo of photos) {
        try {
            const fileLink = await ctx.telegram.getFileLink(photo);
            const doclink = await saveDocument(fileLink, photo);
            const response = await axios.post(backend_URL+'/tasks/'+taskId+'/photos', {photoUrl: doclink});
            console.log('Photo saved:', response.data);
        } catch (error) {
            catchAxiosError(error);
            
        }
    }
}

const getPhotosByTaskId = async (taskId) => {
    try {
        const response = await axios.get(`${backend_URL}/tasks/${taskId}/photos`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getTaskById = async (taskId) => {
    try {
        const response = await axios.get(`${backend_URL}/tasks/${taskId}`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getTasksByCreatorId = async (creatorId) => {
    try {
        const response = await axios.get(`${backend_URL}/tasks/creator/${creatorId}`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getTasksByExecutorId = async (executorId) => {
    try {
        const response = await axios.get(`${backend_URL}/tasks/executor/${executorId}`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getTasksByModeratorId = async (moderatorId) => {
    try {
        const response = await axios.get(`${backend_URL}/tasks/moderator/${moderatorId}`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const declineTask = async (taskId) => {
    try {
        const response = await axios.patch(`${backend_URL}/tasks/${taskId}/decline`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const takeTask = async (taskId, userId, status = 'taken') => {
    try {
        const response = await axios.patch(`${backend_URL}/tasks/${taskId}/take`, { userId, status});
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getAllTasks = async () => {
    try {
        const response = await axios.get(`${backend_URL}/tasks`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

const getAllApprovedTasks = async () => {
    try {
        const response = await axios.get(`${backend_URL}/tasks/approved`);
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}


const searchTasks = async (searchFilters) => {
    try {
        const response = await axios.post(`${backend_URL}/tasks/search`, { searchFilters });
        return response.data;
    } catch (error) {
        catchAxiosError(error);
        
    }
}

module.exports = {
    createTask,
    uploadTaskPhotos,
    getPhotosByTaskId,
    getTasksByCreatorId,
    getTasksByExecutorId,
    getTasksByModeratorId,
    getTaskById,
    takeTask,
    declineTask,
    getAllTasks,
    searchTasks,
    getAllApprovedTasks
}