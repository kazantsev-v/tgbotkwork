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
            } catch (initError) {
                console.error(`Ошибка инициализации: ${initError.message}`);
            }
        }
    }
});

welcomeScene.action('welcome_proceed', async (ctx) => {
    ctx.session.scene = 'roleSelectionScene';
    ctx.scene.enter('roleSelectionScene');
});

module.exports = welcomeScene;
