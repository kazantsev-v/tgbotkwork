const { Scenes, Markup } = require('telegraf');
const { updateUserSceneStep } = require('../utils/user');

// Сцена выбора роли
const roleSelectionScene = new Scenes.BaseScene('roleSelectionScene');

roleSelectionScene.enter(async (ctx) => {
  await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
  ctx.reply(
    'Добро пожаловать! Выберите вашу роль:',
    Markup.inlineKeyboard([
        Markup.button.callback('Заказчик', 'role_customer'),
        Markup.button.callback('Рабочий', 'role_worker')
    ])
  );
});

roleSelectionScene.action('role_customer', (ctx) => {
    ctx.session.role = 'customer';
    ctx.scene.enter('termsScene');
});

roleSelectionScene.action('role_worker', (ctx) => {
    ctx.session.role = 'worker';
    ctx.scene.enter('termsScene');
});

module.exports = roleSelectionScene;
