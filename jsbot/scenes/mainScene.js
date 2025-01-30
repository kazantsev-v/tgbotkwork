const { Scenes, Markup } = require('telegraf');
const { updateUserSceneStep } = require('../utils/user');

const mainScene = new Scenes.BaseScene('mainScene');

mainScene.enter(async (ctx) => {
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    const isCustomer = ctx.session.role === 'customer'; // Проверка роли (заказчик или рабочий)
    
    const customerButtons = [
        [
            Markup.button.callback('Профиль', 'profile')
        ],
        [
            Markup.button.callback('Мои задания', 'my_tasks'),
            Markup.button.callback('Создать задание', 'create_task')
        ],
        [
            Markup.button.callback('Напоминания', 'reminders')
        ],
        [
            Markup.button.callback('Настройки', 'settings')
        ]
    ];
    
    const workerButtons = [
        [
            Markup.button.callback('Профиль', 'profile')
        ],
        [
            Markup.button.callback('Мои заказы', 'my_orders'),
            Markup.button.callback('Поиск', 'search')
        ],
        [
            Markup.button.callback('Просмотр заданий', 'view_tasks')
        ],
        [
            Markup.button.callback('Напоминания', 'reminders')
        ],
        [
            Markup.button.callback('Настройки', 'settings')
        ]
    ];

    const buttons = isCustomer ? customerButtons : workerButtons;

    await ctx.reply('Выберите действие:', Markup.inlineKeyboard(buttons, { columns: 2 }).resize());
});


mainScene.action('profile', async (ctx) => {
    await ctx.scene.enter('profileScene');
});

mainScene.action('create_task', async (ctx) => {
    await ctx.scene.enter('createTaskScene');
});

mainScene.action('my_tasks', async (ctx) => {
    await ctx.scene.enter('customerTasksScene');
});

mainScene.action('my_orders', async (ctx) => {
    await ctx.scene.enter('workerTasksScene');
});

mainScene.action('search', async (ctx) => {
    await ctx.scene.enter('searchTaskScene');
});

mainScene.action('view_tasks', async (ctx) => {
    await ctx.scene.enter('workerViewTasksScene');
});

mainScene.action('settings', async (ctx) => {
    await ctx.reply("Настройки в данный момент не доступны")
});


module.exports = mainScene;
