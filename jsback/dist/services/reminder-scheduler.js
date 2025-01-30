"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSchedules = exports.scheduleDeleteSentReminders = exports.deleteSentReminders = exports.scheduleReminders = exports.sendReminders = void 0;
const node_schedule_1 = require("node-schedule");
const axios_1 = __importDefault(require("axios"));
const database_1 = require("../database");
const reminder_1 = require("../entities/reminder");
const config_1 = __importDefault(require("../config"));
const sendReminders = async () => {
    try {
        const reminderRepo = database_1.AppDataSource.getRepository(reminder_1.Reminder);
        const reminders = await reminderRepo.find({
            where: { status: 'pending' },
            relations: ["user"]
        });
        for (const reminder of reminders) {
            if (new Date(reminder.remindAt) <= new Date()) {
                // Отправляем запрос на API бота
                await axios_1.default.post(`${config_1.default.botURL}/send-message`, {
                    userId: reminder.user.telegramId,
                    message: reminder.message,
                });
                // Обновляем статус напоминания
                reminder.status = 'sent';
                await reminderRepo.save(reminder);
            }
        }
    }
    catch (error) {
        console.error('Ошибка при отправке напоминаний:', error.message);
    }
};
exports.sendReminders = sendReminders;
// Планируем задачу каждую минуту
const scheduleReminders = () => {
    (0, node_schedule_1.scheduleJob)('* * * * *', exports.sendReminders);
};
exports.scheduleReminders = scheduleReminders;
// Удаление всех отправленных напоминаний в конце дня
const deleteSentReminders = async () => {
    try {
        const reminderRepo = database_1.AppDataSource.getRepository(reminder_1.Reminder);
        const result = await reminderRepo.delete({ status: 'sent' });
        console.log(`Удалено отправленных напоминаний: ${result.affected}`);
    }
    catch (error) {
        console.error('Ошибка при удалении отправленных напоминаний:', error.message);
    }
};
exports.deleteSentReminders = deleteSentReminders;
// Планируем задачу для удаления напоминаний каждый день в полночь
const scheduleDeleteSentReminders = () => {
    (0, node_schedule_1.scheduleJob)('0 0 * * *', exports.deleteSentReminders);
};
exports.scheduleDeleteSentReminders = scheduleDeleteSentReminders;
// Инициализация всех задач
const initializeSchedules = () => {
    (0, exports.scheduleReminders)();
    (0, exports.scheduleDeleteSentReminders)();
};
exports.initializeSchedules = initializeSchedules;
