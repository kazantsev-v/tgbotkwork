const { Scenes, Markup } = require('telegraf');
const { updateUserSceneStep } = require('../utils/user');
const { sendKeyboard, clearKeyboard } = require('../utils/keyboardManager');
const { config } = require('../config/config');

const mainScene = new Scenes.BaseScene('mainScene');

mainScene.enter(async (ctx) => {
    // Сначала очищаем предыдущую клавиатуру
    await clearKeyboard(ctx, 'Загрузка главного меню...');

    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    const isCustomer = ctx.session.role === 'customer'; // Проверка роли (заказчик или рабочий)
    const isModerator = ctx.session.role === 'moderator'; // Проверка роли модератора
    
    console.log(ctx.session.role);
    
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
    
    const moderatorButtons = [
        [
            Markup.button.callback('Профиль', 'profile')
        ],
        [
            Markup.button.callback('Админ панель', 'admin_panel')
        ],
        [
            Markup.button.callback('Настройки', 'settings')
        ]
    ];

    // Выбираем набор кнопок в зависимости от роли
    let buttons;
    if (isModerator) {
        buttons = moderatorButtons;
    } else {
        buttons = isCustomer ? customerButtons : workerButtons;
    }

    // Используем новую функцию sendKeyboard для безопасного отображения кнопок
    await sendKeyboard(ctx, 'Выберите действие:', Markup.inlineKeyboard(buttons, { columns: 2 }).resize());
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
    await ctx.reply("Настройки в данный момент не доступны");
});

mainScene.action('admin_panel', async (ctx) => {
    // Проверка на роль модератора для безопасности
    if (ctx.session.role !== 'moderator') {
        return await ctx.reply("У вас нет доступа к админ-панели");
    }
    
    // Формируем URL админ-панели
    const adminPanelUrl = config.adminPanelURL || 'http://localhost:4200';
    
    // Отправляем ссылку на админ-панель
    await ctx.reply(
        "Перейти в админ-панель:",
        Markup.inlineKeyboard([
            Markup.button.url('Открыть админ-панель', adminPanelUrl)
        ])
    );
});

mainScene.action('reminders', async (ctx) => {
    await ctx.scene.enter('remindersScene');
});

module.exports = mainScene;
