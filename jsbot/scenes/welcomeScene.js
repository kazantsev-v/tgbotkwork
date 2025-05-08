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
    if (process.env.NODE_ENV === 'development') {
        //ctx.session = workerInfoSessionMock;
    }
    try {
        console.log(`Получение профиля для пользователя: ${ctx.from.id}`);
        const profile = await getUsersProfile(ctx.from.id);
        
        if (profile) {
            ctx.session.userId = profile.id;
            if (!ctx.session.balance)
                ctx.session.balance = 0;

            if (profile.role === 'moderator') {
                ctx.reply('Добро пожаловать, модератор.', {
                    reply_markup: {
                        inline_keyboard: [
                            [
                                Markup.button.webApp(
                                    'Админ Панель',
                                    'https://bot.moverspb.ru:4200'
                                )
                            ],
                        ],
                    },
                });
                return;
            } else if (profile.role === 'customer') {
                const customerProfile = await getCustomerProfile(ctx.from.id);
                await loadCustomerProfile(customerProfile, ctx);
                console.log(customerProfile);
                ctx.scene.enter(ctx.session.scene || 'mainScene');
                return;
            } else if (
                /worker|driver|rigger|dismantler|loader|handyman/.test(profile.role)
            ) {
                const workerProfile = await getWorkerProfile(ctx.from.id);
                await loadWorkerProfile(workerProfile, ctx);
                console.log(workerProfile);
                ctx.scene.enter(ctx.session.scene || 'mainScene');
                return;
            }
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

    // Если мы дошли до этой точки, значит у пользователя нет роли или это новый пользователь
    try {
        // Попробуем получить профиль ещё раз для новосозданного пользователя
        const profile = await getUsersProfile(ctx.from.id);
        
        if (profile && profile.role !== 'moderator') {
            ctx.session.telegramId = ctx.from.id;
            const welcomeText = `
            Ищете работу?
            - Найдите вакансии по своим навыкам.
            - Сохраните понравившиеся объявления.
            - Получите советы по поиску работы.
            `;
            await ctx.replyWithPhoto({ source: './assets/img/welcome.jpg' }, Markup.removeKeyboard());
            await ctx.reply(welcomeText,
                Markup.inlineKeyboard([
                    Markup.button.callback('Приступить', 'welcome_proceed')
                ])
            );
        } else {
            await ctx.reply('Добро пожаловать! Ваш профиль еще не создан или вы являетесь модератором.');
        }
    } catch (error) {
        console.error(`Финальная ошибка в welcomeScene: ${error.message}`);
        await ctx.reply('Извините, произошла ошибка. Пожалуйста, попробуйте позже или напишите /start снова.');
    }
});

welcomeScene.action('welcome_proceed', async (ctx) => {
    ctx.session.scene = 'roleSelectionScene';
    ctx.scene.enter('roleSelectionScene');
});

module.exports = welcomeScene;
