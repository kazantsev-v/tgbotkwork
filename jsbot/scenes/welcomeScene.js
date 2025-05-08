const { Scenes, Markup } = require('telegraf');
const { workerInfoSessionMock } = require('../models/common');
const {
    initUser,
    updateUserSceneStep,
    loadWorkerProfile,
    loadCustomerProfile,
    getUsersProfile,
    getWorkerProfile,
    getCustomerProfile
} = require("../utils/user");

const welcomeScene = new Scenes.BaseScene('welcomeScene');

welcomeScene.enter(async (ctx) => {
    try {
        console.log(`Получение профиля для пользователя: ${ctx.from.id}`);
        const profile = await getUsersProfile(ctx.from.id);
        
        if (profile) {
            console.log(`Профиль найден: ${JSON.stringify(profile)}`);

            if (profile.role === 'moderator') {
                return;
            } else if (profile.role === 'customer') {
                // Загружаем профиль заказчика
                try {
                    const customerProfile = await getCustomerProfile(ctx.from.id);
                    if (customerProfile) {
                        await loadCustomerProfile(customerProfile, ctx);
                        await ctx.scene.enter('mainScene');
                        return;
                    }
                } catch (err) {
                    console.error(`Ошибка при загрузке профиля заказчика: ${err.message}`);
                }
            } else if (/worker|driver|rigger|dismantler|loader|handyman/.test(profile.role)) {
                // Загружаем профиль работника
                try {
                    const workerProfile = await getWorkerProfile(ctx.from.id);
                    if (workerProfile) {
                        await loadWorkerProfile(workerProfile, ctx);
                        await ctx.scene.enter('mainScene');
                        return;
                    }
                } catch (err) {
                    console.error(`Ошибка при загрузке профиля работника: ${err.message}`);
                }
            }
            
            // Если не удалось загрузить профиль, но пользователь есть - переходим на mainScene
            ctx.session.telegramId = profile.telegramId;
            ctx.session.role = profile.role;
            ctx.session.scene = profile.scene || 'mainScene';
            ctx.session.step = profile.step || 0;
            await ctx.scene.enter('mainScene');
            return;
        } else {
            console.log(`Профиль не найден, создаем новый для пользователя ${ctx.from.id}`);
            // Инициализация нового пользователя
            await initUser({
                telegramId: ctx.from.id,
                scene: ctx.scene.current.id,
                step: ctx.session?.step || 0
            });
            await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session?.step || 0);
            
            // Добавляем приветственное сообщение для новых пользователей
            const userName = ctx.from.first_name || 'уважаемый пользователь';
            await ctx.reply(
                `Приветствую, ${userName}! 👋\n\nДобро пожаловать в наш сервис по поиску заданий и специалистов. Чтобы начать использовать все возможности платформы, необходимо пройти короткую регистрацию.`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('Начать регистрацию', 'start_registration')]
                ])
            );
            return;
        }
    } catch (err) {
        console.log(`Ошибка при получении/создании профиля: ${err.message}`);
        // Только создаем новый профиль, если произошла ошибка, НЕ связанная с сетью
        if (!err.message.includes('network') && !err.message.includes('connect')) {
            try {
                console.log(`Попытка создания пользователя через инициализацию: ${ctx.from.id}`);
                await initUser({
                    telegramId: ctx.from.id,
                    scene: ctx.scene.current.id,
                    step: ctx.session?.step || 0
                });
                await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session?.step || 0);
                
                // Добавляем приветственное сообщение и при ошибке
                const userName = ctx.from.first_name || 'уважаемый пользователь';
                await ctx.reply(
                    `Приветствую, ${userName}! 👋\n\nДобро пожаловать в наш сервис по поиску заданий и специалистов. Чтобы начать использовать все возможности платформы, необходимо пройти короткую регистрацию.`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('Начать регистрацию', 'start_registration')]
                    ])
                );
            } catch (initError) {
                console.error(`Ошибка инициализации: ${initError.message}`);
                await ctx.reply('Произошла ошибка при инициализации профиля. Пожалуйста, попробуйте еще раз через некоторое время или обратитесь в поддержку.');
            }
        } else {
            await ctx.reply('Произошла ошибка при подключении к серверу. Пожалуйста, попробуйте еще раз через некоторое время.');
        }
    }
});

welcomeScene.action('start_registration', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Для начала выберите вашу роль в системе:');
    await ctx.scene.enter('roleSelectionScene');
});

welcomeScene.action('welcome_proceed', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('roleSelectionScene');
});

module.exports = welcomeScene;
