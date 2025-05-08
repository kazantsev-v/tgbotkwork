const { Scenes, Markup } = require('telegraf');

const remindersScene = new Scenes.BaseScene('remindersScene');

remindersScene.enter(async (ctx) => {
    await ctx.reply(
        'Раздел «Напоминания» в разработке. Здесь будут отображаться ваши напоминания.',
        Markup.inlineKeyboard([
            [Markup.button.callback('Назад', 'back_to_main')]
        ])
    );
});

remindersScene.action('back_to_main', async (ctx) => {
    await ctx.scene.enter('mainScene');
});

module.exports = remindersScene;
