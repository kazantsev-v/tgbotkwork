"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../database");
const task_1 = require("../entities/task");
const user_1 = require("../entities/user");
const typeorm_1 = require("typeorm");
const reminder_1 = require("../entities/reminder");
const router = (0, express_1.Router)();
const taskRepo = database_1.AppDataSource.getRepository(task_1.Task);
const userRepo = database_1.AppDataSource.getRepository(user_1.User);
const photoRepo = database_1.AppDataSource.getRepository(task_1.TaskPhoto);
const reminderRepo = database_1.AppDataSource.getRepository(reminder_1.Reminder);
router.get("/", async (req, res) => {
    try {
        const tasks = await taskRepo.find({ relations: ["creator", "executor", "moderator"] });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving tasks", error });
    }
});
router.get("/approved", async (req, res) => {
    try {
        const tasks = await taskRepo.find({
            where: { status: 'approved' },
            relations: ["creator", "executor", "moderator"]
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving tasks", error });
    }
});
router.get("/done", async (req, res) => {
    try {
        const tasks = await taskRepo.find({
            where: { status: 'done' },
            relations: ["creator", "executor", "moderator"]
        });
        res.json(tasks);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving tasks", error });
    }
});
router.post("/search", async (req, res) => {
    const { searchFilters } = req.body;
    try {
        // Создаем условия фильтрации
        const whereConditions = [];
        // Фильтр по фразе
        if (searchFilters.phrase) {
            whereConditions.push({
                title: (0, typeorm_1.Like)(`%${searchFilters.phrase}%`)
            }, {
                description: (0, typeorm_1.Like)(`%${searchFilters.phrase}%`)
            });
        }
        // Фильтр по диапазону оплаты
        if (searchFilters.payment) {
            const { min, max } = searchFilters.payment;
            if (min !== undefined && max !== undefined) {
                whereConditions.push({ payment: (0, typeorm_1.Between)(min, max) });
            }
            else if (min !== undefined) {
                whereConditions.push({ payment: (0, typeorm_1.MoreThanOrEqual)(min) });
            }
            else if (max !== undefined) {
                whereConditions.push({ payment: (0, typeorm_1.LessThanOrEqual)(max) });
            }
        }
        const tasks = await taskRepo.find({
            where: whereConditions.length > 0 ? whereConditions : undefined,
            relations: ["creator", "executor", "moderator"],
        });
        res.json(tasks);
    }
    catch (error) {
        console.log('search err');
        res.status(500).json({ message: "Error during searching tasks", error });
    }
});
router.get("/executor/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const tasks = await taskRepo.find({
            where: { executor: { id: Number(userId) } },
            relations: ["creator", "executor", "moderator"],
        });
        res.json(tasks);
    }
    catch (error) {
        console.log('executor task error');
        res.status(500).json({ message: "Error retrieving tasks for executor", error });
    }
});
router.get("/creator/:userId", async (req, res) => {
    console.log('here in customer tasks');
    const { userId } = req.params;
    try {
        const tasks = await taskRepo.find({
            where: { creator: { id: Number(userId) } },
            relations: ["creator", "executor", "moderator"],
        });
        res.json(tasks);
    }
    catch (error) {
        console.log('creator task error');
        res.status(500).json({ message: "Error retrieving tasks for creator", error });
    }
});
router.get("/moderator/:userId", async (req, res) => {
    const { userId } = req.params;
    try {
        const tasks = await taskRepo.find({
            where: { moderator: { id: Number(userId) } },
            relations: ["creator", "executor", "moderator"],
        });
        res.json(tasks);
    }
    catch (error) {
        console.log('moderator task error');
        res.status(500).json({ message: "Error retrieving tasks for moderator", error });
    }
});
router.put("/:taskId/status", async (req, res) => {
    const { taskId } = req.params;
    const { status } = req.body;
    try {
        const task = (await taskRepo.find({
            where: { id: Number(taskId) },
            relations: ["creator", "executor", "moderator"]
        }))[0];
        if (!task) {
            res.status(404).json({ message: "Task not found" });
            return;
        }
        task.status = status;
        await taskRepo.save(task);
        switch (status) {
            case 'created':
            case 'new': {
                break;
            }
            case 'approved': {
                const users = await userRepo.find({
                    where: {
                        role: (0, typeorm_1.Not)((0, typeorm_1.In)(['customer', 'moderator'])),
                    },
                });
                const reminders = users.map(user => {
                    return reminderRepo.create({
                        user: user,
                        message: `Появилось новое задание: ${task.title}. \nЗаказчик: ${task.creator.name}.`,
                        remindAt: new Date(), // Можно настроить время напоминания
                        status: 'pending'
                    });
                });
                await reminderRepo.save(reminders);
                break;
            }
            case 'waiting':
            case 'wait':
            case 'preparing':
            case 'prepare': {
                const reminder = reminderRepo.create({
                    user: task.creator,
                    message: `Задание: ${task.title}. \nНовый исполнитель: ${task.executor?.name}.`,
                    remindAt: new Date(), // Можно настроить время напоминания
                    status: 'pending',
                });
                await reminderRepo.save(reminder);
                break;
            }
            case 'in work':
            case 'in process':
            case 'work': {
                const reminders = [];
                reminders.push(reminderRepo.create({
                    user: task.creator,
                    message: `Задание: ${task.title} началось.`,
                    remindAt: new Date(), // Можно настроить время напоминания
                    status: 'pending',
                }));
                if (task.executor)
                    reminders.push(reminderRepo.create({
                        user: task.executor,
                        message: `Задание: ${task.title} началось.`,
                        remindAt: new Date(), // Можно настроить время напоминания
                        status: 'pending',
                    }));
                await reminderRepo.save(reminders);
                break;
            }
            case 'reopened':
            case 'declined':
            case 'dropped': {
                task.priority = 10;
                await taskRepo.save(task);
                const reminder = reminderRepo.create({
                    user: task.creator,
                    message: `Задание: ${task.title} было отклонено исполнителем.\n Задание было добавлено в пул заданий с высоким приоритетом`,
                    remindAt: new Date(), // Можно настроить время напоминания
                    status: 'pending',
                });
                await reminderRepo.save(reminder);
                break;
            }
            case 'review': {
                const reminders = [];
                reminders.push(reminderRepo.create({
                    user: task.creator,
                    message: `Исполнитель отметил задание: ${task.title} как выполненое.`,
                    remindAt: new Date(), // Можно настроить время напоминания
                    status: 'pending',
                }));
                if (task.executor)
                    reminders.push(reminderRepo.create({
                        user: task.executor,
                        message: `Вы отметили задание: ${task.title} как выполненое.`,
                        remindAt: new Date(), // Можно настроить время напоминания
                        status: 'pending',
                    }));
                await reminderRepo.save(reminders);
                break;
            }
            case 'finished':
            case 'finish':
            case 'completed':
            case 'complete':
            case 'ended':
            case 'end': {
                const reminders = [];
                reminders.push(reminderRepo.create({
                    user: task.creator,
                    message: `Задание: ${task.title} закончилось.`,
                    remindAt: new Date(), // Можно настроить время напоминания
                    status: 'pending',
                }));
                if (task.executor)
                    reminders.push(reminderRepo.create({
                        user: task.executor,
                        message: `Задание: ${task.title} закончилось.`,
                        remindAt: new Date(), // Можно настроить время напоминания
                        status: 'pending',
                    }));
                await reminderRepo.save(reminders);
                // TODO: change executor balance (+ task reward)
                break;
            }
        }
        res.json({ message: "Status updated successfully", task });
    }
    catch (error) {
        res.status(500).json({ message: "Error updating task status", error });
    }
});
router.get("/:taskId/photos", async (req, res) => {
    const { taskId } = req.params;
    try {
        const photos = await photoRepo.find({ where: { task: { id: Number(taskId) } } });
        res.json(photos);
    }
    catch (error) {
        res.status(500).json({ message: "Error retrieving photos for task", error });
    }
});
router.post('/:taskId/photos', async (req, res) => {
    const { taskId } = req.params;
    const { photoUrl } = req.body;
    if (!photoUrl) {
        res.status(400).json({ error: 'Photo URL is required' });
        return;
    }
    try {
        const taskRepo = database_1.AppDataSource.getRepository(task_1.Task);
        const photoRepo = database_1.AppDataSource.getRepository(task_1.TaskPhoto);
        // Проверяем, существует ли задание
        const task = await taskRepo.findOneBy({ id: Number(taskId) });
        if (!task) {
            res.status(404).json({ error: 'Task not found' });
            return;
        }
        // Создаем и сохраняем фото
        const newPhoto = photoRepo.create({
            task,
            photo_url: photoUrl,
        });
        const savedPhoto = await photoRepo.save(newPhoto);
        res.status(201).json({
            message: 'Photo added successfully',
            photo: savedPhoto,
        });
    }
    catch (error) {
        console.error('Error saving photo:', error);
        res.status(500).json({ error: 'Error saving photo' });
    }
});
router.post("/", async (req, res) => {
    console.log('here in post task');
    try {
        const reqtask = req.body;
        const user = await userRepo.findOneBy({ id: reqtask.creator.id });
        reqtask.creator = user;
        const task = taskRepo.create(reqtask);
        const savedTask = await taskRepo.save(task);
        res.json({ message: "Task created successfully", task: savedTask });
    }
    catch (error) {
        console.error('Error saving task:', error);
        res.status(500).json({ message: "Error creating task", error });
    }
});
router.patch('/:taskId/decline', async (req, res) => {
    const { taskId } = req.params;
    try {
        const task = await taskRepo.findOne({
            where: { id: Number(taskId) },
            relations: ["creator", "executor", "moderator"],
        });
        if (!task) {
            res.status(404).json({ message: 'Задание не найдено.' });
            return;
        }
        task.status = 'pending';
        task.executor = null;
        await taskRepo.save(task);
        res.json({ message: 'Статус задания обновлен.', task });
    }
    catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ message: 'Ошибка обновления статуса задания.' });
    }
});
router.patch('/:taskId/take', async (req, res) => {
    const { taskId } = req.params;
    const { userId, status } = req.body;
    try {
        const taskRepo = database_1.AppDataSource.getRepository(task_1.Task);
        const task = await taskRepo.findOneBy({ id: Number(taskId) });
        const user = await userRepo.findOneBy({ id: Number(userId) });
        if (!task || !user) {
            res.status(404).json({ message: 'Задание или пользователь не найдены.' });
            return;
        }
        task.executor = user;
        task.status = status;
        await taskRepo.save(task);
        res.json({ message: 'Статус задания обновлен.', task });
    }
    catch (error) {
        console.error('Ошибка обновления статуса:', error);
        res.status(500).json({ message: 'Ошибка обновления статуса задания.' });
    }
});
router.get("/:taskId", async (req, res) => {
    const { taskId } = req.params;
    try {
        const resTask = await taskRepo.findOneBy({ id: Number(taskId) });
        res.json(resTask);
    }
    catch (error) {
        console.log('by task id error');
        res.status(500).json({ message: "Error retrieving task", error });
    }
});
exports.default = router;
