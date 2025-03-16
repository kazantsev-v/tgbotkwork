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
        const profile = await getUsersProfile(ctx.from.id);
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
            ctx.scene.enter(ctx.session.scene || 'welcomeScene');
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
    } catch (err) {
        //console.log(err.message);
        console.log('user не найден');
        await initUser({
            telegramId: ctx.from.id,
            scene: ctx.scene.current.id,
            step: ctx.session?.step
        });
        await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    }

    const profile = await getUsersProfile(ctx.from.id);

    if (profile.role != 'moderator') {
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
        console.log('in end of welcome scene')

        welcomeScene.action('welcome_proceed', async (ctx) => {
            ctx.session.scene = 'roleSelectionScene';
            ctx.scene.enter('roleSelectionScene');
        });
    }
});

module.exports = welcomeScene;
