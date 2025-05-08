const { Scenes, Markup } = require('telegraf');
const { updateUserSceneStep } = require('../utils/user');

const termsScene = new Scenes.BaseScene('termsScene');

termsScene.enter(async (ctx) => {
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    
    await ctx.reply('Для продолжения примите пользовательское соглашение.', {
        reply_markup: {
            inline_keyboard: [
                [
                    Markup.button.webApp(
                        'Лицензионное соглашение',
                        'https://moverspb.ru/agreement/'
                    ),
                    { text: 'Принять', callback_data: 'accept_terms' }
                ]
            ]
        }
    });
});

termsScene.action('accept_terms', async (ctx) => {
    try {
        await ctx.reply('Спасибо! Вы приняли соглашение.', Markup.removeKeyboard());
        await ctx.scene.enter('registrationScene');
    } catch (error) {
        console.error('Ошибка при обработке принятия условий:', error);
        await ctx.reply('Произошла ошибка. Пожалуйста, попробуйте еще раз.');
    }
});

// Обработчик текстовых сообщений
termsScene.on('text', async (ctx) => {
    await ctx.reply('Пожалуйста, нажмите кнопку "Принять" ниже, чтобы продолжить.');
});

module.exports = termsScene;
