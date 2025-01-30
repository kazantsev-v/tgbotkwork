import { AppDataSource } from "../database";
import { Reminder } from "../entities/reminder";
import { User } from "../entities/user";
import router from "./userRoutes";

router.post('/', async (req, res) => {
    console.log('Creating a reminder...');
    const { userId, message, remindAt } = req.body;
    console.log(userId, message, remindAt);
    console.log('rem rep');
    const reminderRepo = AppDataSource.getRepository(Reminder);
    console.log('user rep');
    const userRepo = AppDataSource.getRepository(User);

    try {
        let user = await userRepo.findOneBy({ id: userId });
        console.log('User:', user);
        if(!user) {
            res.status(404).json({ message: 'Пользователь не найден' });
            return;
        }
        const reminder = reminderRepo.create({ 
            user, 
            message, 
            remindAt, 
            status: 'pending' 
        });
        console.log(reminder)
        const savedReminder = await reminderRepo.save(reminder);
        console.log(savedReminder)
        res.json(savedReminder);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'An error occurred while creating a reminder' });
    }
});

export default router;