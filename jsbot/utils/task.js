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
const { catchAxiosError, retry, safeExecute } = require('./errorHandler');
const logger = require('./logger');
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
        logger.info('Creating new task', { creator, taskTitle: task.title });
        const response = await retry(
            () => axios.post(backend_URL+'/tasks', taskObj),
            [],
            { context: 'createTask' }
        );
        logger.info('Task saved successfully', { taskId: response.data.task.id });
        return response.data.task; // Успешный ответ
    } catch (error) {
        logger.error('Failed to create task', { error, creator, taskTitle: task.title });
        return null;
    }
}

const uploadTaskPhotos = async (ctx, taskId, photos) => {
    const results = [];
    
    for(let photo of photos) {
        try {
            logger.debug('Uploading photo for task', { taskId, photoId: photo });
            const fileLink = await ctx.telegram.getFileLink(photo);
            const doclink = await saveDocument(fileLink, photo);
            const response = await retry(
                () => axios.post(backend_URL+'/tasks/'+taskId+'/photos', {photoUrl: doclink}),
                [],
                { context: 'uploadTaskPhoto', initialDelay: 500, maxRetries: 2 }
            );
            logger.debug('Photo saved', { taskId, photoUrl: doclink });
            results.push(response.data);
        } catch (error) {
            logger.error('Failed to upload photo', { error, taskId, photoId: photo });
        }
    }
    
    return results.length > 0 ? results : null;
}

const getPhotosByTaskId = async (taskId) => {
    try {
        logger.debug('Getting photos for task', { taskId });
        const response = await axios.get(`${backend_URL}/tasks/${taskId}/photos`);
        return response.data;
    } catch (error) {
        logger.error('Failed to get photos', { taskId, error });
        catchAxiosError(error, `Getting photos for task ${taskId}`);
        return null;
    }
}

const getTaskById = async (taskId) => {
    try {
        logger.debug('Getting task by ID', { taskId });
        const response = await retry(
            () => axios.get(`${backend_URL}/tasks/${taskId}`),
            [],
            { context: `getTaskById-${taskId}` }
        );
        return response.data;
    } catch (error) {
        logger.error('Failed to get task by ID', { taskId, error });
        return null;
    }
}

const getTasksByCreatorId = async (creatorId) => {
    try {
        logger.debug('Getting tasks by creator ID', { creatorId });
        const response = await axios.get(`${backend_URL}/tasks/creator/${creatorId}`);
        return response.data;
    } catch (error) {
        logger.error('Failed to get tasks by creator ID', { creatorId, error });
        catchAxiosError(error, `Getting tasks for creator ${creatorId}`);
        return null;
    }
}

const getTasksByExecutorId = async (executorId) => {
    try {
        logger.debug('Getting tasks by executor ID', { executorId });
        const response = await axios.get(`${backend_URL}/tasks/executor/${executorId}`);
        return response.data;
    } catch (error) {
        logger.error('Failed to get tasks by executor ID', { executorId, error });
        catchAxiosError(error, `Getting tasks for executor ${executorId}`);
        return null;
    }
}

const getTasksByModeratorId = async (moderatorId) => {
    try {
        logger.debug('Getting tasks by moderator ID', { moderatorId });
        const response = await axios.get(`${backend_URL}/tasks/moderator/${moderatorId}`);
        return response.data;
    } catch (error) {
        logger.error('Failed to get tasks by moderator ID', { moderatorId, error });
        catchAxiosError(error, `Getting tasks for moderator ${moderatorId}`);
        return null;
    }
}

const declineTask = async (taskId) => {
    try {
        logger.info('Declining task', { taskId });
        const response = await retry(
            () => axios.patch(`${backend_URL}/tasks/${taskId}/decline`),
            [],
            { context: `declineTask-${taskId}` }
        );
        return response.data;
    } catch (error) {
        logger.error('Failed to decline task', { taskId, error });
        return null;
    }
}

const takeTask = async (taskId, userId, status = 'taken') => {
    try {
        logger.info('Taking task', { taskId, userId, status });
        const response = await retry(
            () => axios.patch(`${backend_URL}/tasks/${taskId}/take`, { userId, status}),
            [],
            { context: `takeTask-${taskId}` }
        );
        return response.data;
    } catch (error) {
        logger.error('Failed to take task', { taskId, userId, error });
        return null;
    }
}

const getAllTasks = async () => {
    try {
        logger.debug('Getting all tasks');
        const response = await axios.get(`${backend_URL}/tasks`);
        return response.data;
    } catch (error) {
        logger.error('Failed to get all tasks', { error });
        catchAxiosError(error, 'Getting all tasks');
        return null;
    }
}

const getAllApprovedTasks = async () => {
    try {
        logger.debug('Getting all approved tasks');
        const response = await axios.get(`${backend_URL}/tasks/approved`);
        return response.data;
    } catch (error) {
        logger.error('Failed to get approved tasks', { error });
        catchAxiosError(error, 'Getting all approved tasks');
        return null;
    }
}

const searchTasks = async (searchFilters) => {
    try {
        logger.debug('Searching tasks', { filters: searchFilters });
        const response = await axios.post(`${backend_URL}/tasks/search`, { searchFilters });
        return response.data;
    } catch (error) {
        logger.error('Failed to search tasks', { filters: searchFilters, error });
        catchAxiosError(error, 'Searching tasks');
        return null;
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