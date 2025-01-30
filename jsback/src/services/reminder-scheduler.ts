import { scheduleJob } from 'node-schedule';
import axios from 'axios';
import { AppDataSource } from '../database';
import { Reminder } from '../entities/reminder';
import Config from '../config';

export const sendReminders = async () => {
    try {
        const reminderRepo = AppDataSource.getRepository(Reminder);
        const reminders = await reminderRepo.find({ 
            where: { status: 'pending' },
            relations: ["user"]  
        });

        for (const reminder of reminders) {
            if (new Date(reminder.remindAt) <= new Date()) {
                // Отправляем запрос на API бота
                await axios.post(`${Config.botURL}/send-message`, {
                    userId: reminder.user.telegramId,
                    message: reminder.message,
                });
                // Обновляем статус напоминания
                reminder.status = 'sent';
                await reminderRepo.save(reminder);
            }
        }
    } catch (error: any) {
        console.error('Ошибка при отправке напоминаний:', error.message);
    }
};

// Планируем задачу каждую минуту
export const scheduleReminders = () => {
    scheduleJob('* * * * *', sendReminders);
};

// Удаление всех отправленных напоминаний в конце дня
export const deleteSentReminders = async () => {
    try {
        const reminderRepo = AppDataSource.getRepository(Reminder);
        const result = await reminderRepo.delete({ status: 'sent' });
        console.log(`Удалено отправленных напоминаний: ${result.affected}`);
    } catch (error: any) {
        console.error('Ошибка при удалении отправленных напоминаний:', error.message);
    }
};

// Планируем задачу для удаления напоминаний каждый день в полночь
export const scheduleDeleteSentReminders = () => {
    scheduleJob('0 0 * * *', deleteSentReminders);
};

// Инициализация всех задач
export const initializeSchedules = () => {
    scheduleReminders();
    scheduleDeleteSentReminders();
};
