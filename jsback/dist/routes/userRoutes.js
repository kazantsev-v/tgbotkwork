"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const user_1 = require("../entities/user");
const reminder_1 = require("../entities/reminder");
const date_fns_1 = require("date-fns");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const task_1 = require("../entities/task");
const router = (0, express_1.Router)();
// Получение всех пользователей
router.get("/", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const users = await userRepo.find();
    res.json(users);
});
// Получение всех customers
router.get("/customer", async (req, res) => {
    const customerRepo = database_1.AppDataSource.getRepository(user_1.Customer);
    const customers = await customerRepo.find({ relations: ["user"] });
    res.json(customers);
});
// Получение всех workers
router.get("/worker", async (req, res) => {
    const workerRepo = database_1.AppDataSource.getRepository(user_1.Worker);
    const workers = await workerRepo.find({ relations: ["user"] });
    res.json(workers);
});
// Получение всех moderators
router.get("/moderator", async (req, res) => {
    const moderatorRepo = database_1.AppDataSource.getRepository(user_1.Moderator);
    const moderators = await moderatorRepo.find({ relations: ["user"] });
    res.json(moderators);
});
// Добавление нового пользователя
router.post("/", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const workerRepo = database_1.AppDataSource.getRepository(user_1.Worker);
    const customerRepo = database_1.AppDataSource.getRepository(user_1.Customer);
    const reminderRepo = database_1.AppDataSource.getRepository(reminder_1.Reminder);
    let user = await userRepo.findOneBy({ telegramId: req.body.telegramId });
    if (user) {
        await userRepo.remove(user);
    }
    const newUser = userRepo.create(req.body);
    const savedUser = await userRepo.save(newUser);
    res.json(savedUser);
    if (user?.role === 'worker') {
        const worker = await workerRepo.findOne({ where: { user } });
        if (!worker) {
            await handleRoleReminder(user, reminderRepo);
        }
    }
    else if (user?.role === 'customer') {
        const customer = await customerRepo.findOne({ where: { user } });
        if (!customer) {
            await handleRoleReminder(user, reminderRepo);
        }
    }
});
// Добавление нового заказчика
router.post("/customer/", async (req, res) => {
    const customer = req.body;
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const customerRepo = database_1.AppDataSource.getRepository(user_1.Customer);
    let user = await userRepo.findOneBy({ telegramId: req.body.telegramId });
    if (user) {
        await userRepo.remove(user);
    }
    const newUser = userRepo.create(req.body);
    const savedUser = await userRepo.save(newUser);
    customer.user = savedUser;
    const newCustomer = customerRepo.create(customer);
    const savedCustormer = await customerRepo.save(newCustomer);
    res.json(savedCustormer);
});
// Добавление нового работника
router.post("/worker/", async (req, res) => {
    const worker = req.body;
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const workerRepo = database_1.AppDataSource.getRepository(user_1.Worker);
    let user = await userRepo.findOneBy({ telegramId: req.body.telegramId });
    if (user) {
        await userRepo.remove(user);
    }
    const newUser = userRepo.create(req.body);
    const savedUser = await userRepo.save(newUser);
    worker.user = savedUser;
    const newWorker = workerRepo.create(worker);
    const savedWorker = await workerRepo.save(newWorker);
    res.json(savedWorker);
});
// Получение пользователя по telegramId
router.get("/:telegramId", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const telegramId = req.params.telegramId;
    try {
        const user = await userRepo.findOneBy({ telegramId: Number(telegramId) });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        res.json(user);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving user", error });
    }
});
// Получение Customer по telegramId
router.get("/customer/:telegramId", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const customerRepo = database_1.AppDataSource.getRepository(user_1.Customer);
    const telegramId = Number(req.params.telegramId);
    try {
        const user = await userRepo.findOneBy({ telegramId });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const customer = await customerRepo.findOne({
            where: { user: user },
            relations: ["user"], // Подгружаем связанную сущность User, если нужно
        });
        if (!customer) {
            res.status(404).json({ message: "Customer not found" });
            return;
        }
        res.json(customer);
    }
    catch (error) {
        console.error("Error retrieving customer:", error);
        res.status(500).json({ message: "Error retrieving customer", error });
    }
});
// Получение Workers по telegramId
router.get("/worker/:telegramId", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const workerRepo = database_1.AppDataSource.getRepository(user_1.Worker);
    const telegramId = Number(req.params.telegramId);
    try {
        const user = await userRepo.findOneBy({ telegramId });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const worker = await workerRepo.findOne({
            where: { user: user },
            relations: ["user"], // Подгружаем связанную сущность User, если нужно
        });
        if (!worker) {
            res.status(404).json({ message: "Worker not found" });
            return;
        }
        res.json(worker);
    }
    catch (error) {
        console.error("Error retrieving worker:", error);
        res.status(500).json({ message: "Error retrieving worker", error });
    }
});
// Получение Moderators по telegramId
router.get("/moderator/:telegramId", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const moderatorRepo = database_1.AppDataSource.getRepository(user_1.Moderator);
    const telegramId = Number(req.params.telegramId);
    try {
        const user = await userRepo.findOneBy({ telegramId });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const moderator = await moderatorRepo.findOne({
            where: { user: user },
            relations: ["user"], // Подгружаем связанную сущность User, если нужно
        });
        if (!moderator) {
            res.status(404).json({ message: "Moderator not found" });
            return;
        }
        res.json(moderator);
    }
    catch (error) {
        console.error("Error retrieving moderator:", error);
        res.status(500).json({ message: "Error retrieving moderator", error });
    }
});
router.patch("/updateSceneStep/:telegramId", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const workerRepo = database_1.AppDataSource.getRepository(user_1.Worker);
    const customerRepo = database_1.AppDataSource.getRepository(user_1.Customer);
    const reminderRepo = database_1.AppDataSource.getRepository(reminder_1.Reminder);
    const { telegramId } = req.params;
    const { scene, step } = req.body;
    try {
        const user = await userRepo.findOneBy({ telegramId: Number(telegramId) });
        if (!user) {
            let nUser = new user_1.User();
            nUser.scene = scene;
            nUser.step = step;
            nUser.telegramId = +telegramId;
            const newUser = userRepo.create(req.body);
            const savedUser = await userRepo.save(newUser);
            res.json(savedUser);
        }
        else {
            user.scene = scene ?? user.scene;
            user.step = step ?? user.step;
            const updatedUser = await userRepo.save(user);
            res.json(updatedUser);
        }
        if (user?.role === 'worker') {
            const worker = await workerRepo.findOne({ where: { user } });
            if (!worker) {
                await handleRoleReminder(user, reminderRepo);
            }
        }
        else if (user?.role === 'customer') {
            const customer = await customerRepo.findOne({ where: { user } });
            if (!customer) {
                await handleRoleReminder(user, reminderRepo);
            }
        }
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ message: "Error updating user", error });
    }
});
router.patch("/changeBalance/:telegramId", async (req, res) => {
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const { telegramId } = req.params;
    const { balance } = req.body;
    try {
        const user = await userRepo.findOneBy({ telegramId: Number(telegramId) });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        if (typeof balance !== "number" || balance < 0) {
            res.status(400).json({ message: "Invalid balance" });
            return;
        }
        user.balance = balance;
        const updatedUser = await userRepo.save(user);
        res.json({
            message: "Balance updated successfully",
            balance: updatedUser.balance,
        });
    }
    catch (error) {
        console.error("Error updating balance:", error);
        res.status(500).json({ message: "Error updating balance", error });
    }
});
router.post('/moderators/login', async (req, res) => {
    const { telegramId, password } = req.body;
    const moderatorRepository = database_1.AppDataSource.getRepository(user_1.Moderator);
    const moderator = await moderatorRepository.findOne({
        where: {
            user: {
                telegramId: Number(telegramId)
            },
        },
        relations: ["user"]
    });
    if (!moderator) {
        res.status(404).json({ message: 'Модератор не найден' });
    }
    else {
        if (String(moderator.password) == password) {
            const token = jsonwebtoken_1.default.sign({ id: moderator.id }, 'secret_key', { expiresIn: '10h' });
            res.status(200).json({ message: 'Авторизация успешна', token });
        }
        else {
            res.status(401).json({ message: 'Неверный пароль' });
        }
    }
});
router.post('/moderators/register', async (req, res) => {
    const { telegramId, password } = req.body;
    try {
        const userRepository = database_1.AppDataSource.getRepository(user_1.User);
        const user = await userRepository.findOne({ where: { telegramId } });
        if (!user) {
            res.status(404).json({ message: 'Пользователь с таким Telegram ID не найден.' });
            return;
        }
        const moderatorRepository = database_1.AppDataSource.getRepository(user_1.Moderator);
        const existingModerator = user ? await moderatorRepository.findOne({ where: { user } }) : null;
        if (existingModerator) {
            res.status(400).json({ message: 'Этот пользователь уже является модератором.' });
            return;
        }
        // Создаем нового модератора
        const moderator = new user_1.Moderator();
        if (user)
            moderator.user = user;
        moderator.password = password; // Пароль будет хэшироваться через метод hashPassword
        await moderatorRepository.save(moderator);
        res.status(201).json({ message: 'Модератор успешно зарегистрирован!' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Ошибка сервера.' });
    }
});
router.get("/worker/:telegramId/stats", async (req, res) => {
    const { telegramId } = req.params;
    const userRepo = database_1.AppDataSource.getRepository(user_1.User);
    const workerRepo = database_1.AppDataSource.getRepository(user_1.Worker);
    const taskRepo = database_1.AppDataSource.getRepository(task_1.Task);
    try {
        const user = await userRepo.findOneBy({ telegramId: Number(telegramId) });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const worker = await workerRepo.findOne({
            where: { user: user },
            relations: ["user"],
        });
        if (!worker) {
            res.status(404).json({ message: "Worker not found" });
            return;
        }
        const completedTasks = await taskRepo.find({
            where: { executor: user, status: 'finished' },
        });
        const income = completedTasks.reduce((total, task) => total + task.payment, 0);
        const stats = {
            balance: user.balance,
            income: income,
            completedTasks: completedTasks.length,
            rating: worker.rating,
        };
        res.json(stats);
    }
    catch (error) {
        console.error("Error retrieving worker stats:", error);
        res.status(500).json({ message: "Error retrieving worker stats", error });
    }
});
async function handleRoleReminder(user, reminderRepo) {
    const nextDayAtTen = (0, date_fns_1.setSeconds)((0, date_fns_1.setMinutes)((0, date_fns_1.setHours)((0, date_fns_1.addDays)(new Date(), 1), 10), 0), 0);
    const existingReminder = await reminderRepo.findOne({
        where: { user, message: "Мы заметили, что вы начали процесс регистрации, но не завершили его. Пожалуйста, завершите регистрацию, чтобы получить доступ к нашим услугам и функциям. Это займет всего несколько минут!" },
    });
    if (existingReminder) {
        // Обновляем время напоминания
        existingReminder.remindAt = nextDayAtTen;
        existingReminder.status = 'pending';
        await reminderRepo.save(existingReminder);
    }
    else {
        // Создаем новое напоминание
        const newReminder = reminderRepo.create({
            user,
            message: "Мы заметили, что вы начали процесс регистрации, но не завершили его. Пожалуйста, завершите регистрацию, чтобы получить доступ к нашим услугам и функциям. Это займет всего несколько минут!",
            remindAt: nextDayAtTen,
            status: 'pending',
        });
        await reminderRepo.save(newReminder);
    }
}
exports.default = router;
