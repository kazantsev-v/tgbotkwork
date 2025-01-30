"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../database");
const reminder_1 = require("../entities/reminder");
const user_1 = require("../entities/user");
const userRoutes_1 = __importDefault(require("./userRoutes"));
userRoutes_1.default.post('/', async (req, res) => {
    console.log('Creating a reminder...');
    const { userId, message, remindAt } = req.body;
    console.log(userId, message, remindAt);
    console.log('rem rep');
    const reminderRepo = database_1.AppDataSource.getRepository(reminder_1.Reminder);
    console.log('user rep');
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    try {
        let user = await userRepo.findOneBy({ id: userId });
        console.log('User:', user);
        if (!user) {
            res.status(404).json({ message: 'Пользователь не найден' });
            return;
        }
        const reminder = reminderRepo.create({
            user,
            message,
            remindAt,
            status: 'pending'
        });
        console.log(reminder);
        const savedReminder = await reminderRepo.save(reminder);
        console.log(savedReminder);
        res.json(savedReminder);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred while creating a reminder' });
    }
});
exports.default = userRoutes_1.default;
