const { Markup } = require('telegraf');
const axios = require('axios');
const { config } = require('../config/config');
const { getAllApprovedTasks, getTaskById } = require('./task');
const { getUsersProfile } = require('./user');
const { formatDate } = require('./common');

// Массив ID чатов для отправки уведомлений
// Будет обновляться через API или при добавлении бота в группу
let notificationChatIds = [];

/**
 * Загружает список чатов для уведомлений из базы данных
 */
const loadNotificationChats = async () => {
    try {
        const response = await axios.get(`${config.backendURL}/notification-chats`);
        if (response.data && Array.isArray(response.data)) {
            notificationChatIds = response.data.map(chat => chat.chatId);
            console.log(`Загружено ${notificationChatIds.length} чатов для уведомлений`);
        }
        return notificationChatIds;
    } catch (error) {
        console.error('Ошибка при загрузке чатов для уведомлений:', error.message);
        return [];
    }
};

/**
 * Добавляет чат в список для уведомлений
 * @param {string} chatId ID чата
 * @param {string} chatTitle Название чата
 * @param {string} chatType Тип чата (group, supergroup)
 */
const addNotificationChat = async (chatId, chatTitle, chatType) => {
    try {
        // Проверяем, если чат уже есть в списке
        if (notificationChatIds.includes(chatId)) {
            return true;
        }
        
        // Добавляем в базу данных
        const response = await axios.post(`${config.backendURL}/notification-chats`, {
            chatId,
            chatTitle,
            chatType
        });
        
        if (response.data) {
            notificationChatIds.push(chatId);
            console.log(`Добавлен чат для уведомлений: ${chatTitle} (${chatId})`);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Ошибка при добавлении чата для уведомлений:', error.message);
        return false;
    }
};

/**
 * Удаляет чат из списка для уведомлений
 * @param {string} chatId ID чата
 */
const removeNotificationChat = async (chatId) => {
    try {
        // Удаляем из базы данных
        await axios.delete(`${config.backendURL}/notification-chats/${chatId}`);
        
        // Удаляем из локального списка
        notificationChatIds = notificationChatIds.filter(id => id !== chatId);
        console.log(`Удален чат для уведомлений: ${chatId}`);
        return true;
    } catch (error) {
        console.error('Ошибка при удалении чата для уведомлений:', error.message);
        return false;
    }
};

/**
 * Отправляет уведомление о новом задании всем пользователям и в групповые чаты
 * @param {object} bot Экземпляр бота Telegraf
 * @param {object} task Объект задания
 * @param {boolean} isApproved Флаг, было ли задание только что одобрено модератором
 */
const sendTaskNotification = async (bot, task, isApproved = false) => {
    try {
        // Убедимся, что у нас есть актуальный список чатов
        if (notificationChatIds.length === 0) {
            await loadNotificationChats();
        }
        
        // Если задание только что было одобрено, получаем его свежую версию из БД
        if (isApproved && task.id) {
            const freshTask = await getTaskById(task.id);
            if (freshTask) {
                task = freshTask;
            }
        }
        
        // Формируем красивое сообщение о задании
        const message = formatTaskNotification(task, isApproved);
        
        // Создаем инлайн-клавиатуру для задания
        const keyboard = Markup.inlineKeyboard([
            [Markup.button.callback('👁️ Подробнее', `view_notification_task_${task.id}`)],
            [Markup.button.callback('💼 Взять заказ', `take_notification_task_${task.id}`)]
        ]);
        
        // Получаем список рабочих, которым нужно отправить уведомление
        // В будущем здесь можно добавить логику фильтрации по специализации
        const workers = await getWorkersToNotify();
        
        // Отправляем личные сообщения подходящим работникам
        for (const worker of workers) {
            try {
                await bot.telegram.sendMessage(worker.telegramId, message, {
                    parse_mode: 'HTML',
                    ...keyboard
                });
                console.log(`Отправлено уведомление о задании ${task.id} пользователю ${worker.telegramId}`);
            } catch (error) {
                console.error(`Ошибка при отправке уведомления пользователю ${worker.telegramId}:`, error.message);
            }
        }
        
        // Отправляем в групповые чаты
        for (const chatId of notificationChatIds) {
            try {
                await bot.telegram.sendMessage(chatId, message, {
                    parse_mode: 'HTML',
                    ...keyboard
                });
                console.log(`Отправлено уведомление о задании ${task.id} в чат ${chatId}`);
            } catch (error) {
                console.error(`Ошибка при отправке уведомления в чат ${chatId}:`, error.message);
                
                // Если бота удалили из чата, удаляем чат из списка
                if (error.message.includes('bot was kicked') || 
                    error.message.includes('chat not found') || 
                    error.message.includes('bot was blocked')) {
                    await removeNotificationChat(chatId);
                }
            }
        }
        
        return true;
    } catch (error) {
        console.error('Ошибка при отправке уведомлений о задании:', error.message);
        return false;
    }
};

/**
 * Получает список рабочих, которым нужно отправить уведомление
 * @returns {Array} Массив объектов с данными рабочих
 */
const getWorkersToNotify = async () => {
    try {
        // В будущем здесь можно добавить фильтрацию по специализации и т.д.
        const response = await axios.get(`${config.backendURL}/users/workers`);
        return response.data || [];
    } catch (error) {
        console.error('Ошибка при получении списка рабочих для уведомлений:', error.message);
        return [];
    }
};

/**
 * Форматирует задание для отправки уведомления
 * @param {object} task Объект задания
 * @param {boolean} isApproved Флаг, одобрено ли задание модератором
 * @returns {string} Отформатированный текст сообщения в HTML
 */
const formatTaskNotification = (task, isApproved) => {
    const statusBadge = isApproved ? '✅ ОДОБРЕНО' : '🆕 НОВОЕ';
    const dates = Array.isArray(task.dates) ? task.dates.join(', ') : task.dates;
    
    return `
<b>${statusBadge} ЗАДАНИЕ</b>

<b>📋 Название:</b> ${task.title}
<b>📝 Описание:</b> ${task.description}
<b>💰 Оплата:</b> ${task.payment} руб.
<b>📍 Место:</b> ${task.location}
<b>📅 Даты:</b> ${dates}
<b>⏰ Время начала:</b> ${task.start_time || 'Не указано'}
<b>⏱️ Длительность:</b> ${task.duration || 'Не указано'} ч.

<i>Нажмите кнопку "Подробнее" для просмотра полной информации или "Взять заказ" чтобы откликнуться на задание.</i>
`;
};

/**
 * Отправляет уведомления о новых заданиях, одобренных модератором
 * @param {object} bot Экземпляр бота Telegraf
 */
const sendNewTasksNotifications = async (bot) => {
    try {
        // Получаем все одобренные задания, которые еще не были отправлены
        const approvedTasks = await getAllApprovedTasks();
        
        // Фильтруем задания, по которым не были отправлены уведомления
        // В будущем можно добавить флаг notificationSent в базу данных
        const tasksToNotify = approvedTasks.filter(task => 
            task.status === 'approved' && !task.notificationSent);
        
        console.log(`Найдено ${tasksToNotify.length} новых одобренных заданий для отправки уведомлений`);
        
        // Отправляем уведомления по каждому заданию
        for (const task of tasksToNotify) {
            await sendTaskNotification(bot, task, true);
            
            // Обновляем флаг, что уведомление отправлено
            // В будущем это нужно реализовать в базе данных
            await axios.patch(`${config.backendURL}/tasks/${task.id}`, {
                notificationSent: true
            });
        }
        
        return tasksToNotify.length;
    } catch (error) {
        console.error('Ошибка при отправке уведомлений о новых заданиях:', error.message);
        return 0;
    }
};

// Экспортируем функции
module.exports = {
    loadNotificationChats,
    addNotificationChat,
    removeNotificationChat,
    sendTaskNotification,
    sendNewTasksNotifications,
    formatTaskNotification
};