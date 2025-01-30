const { Markup, Scenes } = require('telegraf');
const { enter, leave } = Scenes.Stage;
const { config } = require('../config/config');
const { updateUserSceneStep } = require('../utils/user');

const termsScene = new Scenes.BaseScene('termsScene');

termsScene.enter(async (ctx) => {
  await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
  ctx.reply('Для продолжения примите пользовательское соглашение.', {
    reply_markup: {
        inline_keyboard: [
            [
                Markup.button.webApp(
                    'Открыть соглашение',
                    (ctx.session.role === 'worker'?config.termsForWorkersLink:config.termsForCustomersLink)
                ),
                  Markup.button.callback('Skip(временно)','agreed')
            ],
        ],
      },
    });

    /*ctx.reply(
      'Для начала ознакомьтесь с пользовательским соглашением',
      Markup.inlineKeyboard([
        [Markup.button.url('Пользовательское соглашение', (ctx.session.role === 'worker'?config.termsForWorkersLink:config.termsForCustomersLink))],
        [Markup.button.callback('Ознакомлен', 'agreed')],
      ])
    );*/
  });

  termsScene.on('message', (ctx) => {
    if (ctx.webAppData) {
        const data = JSON.parse(ctx.webAppData.data);
        if (data.agreementAccepted) {
            ctx.reply('Спасибо за принятие соглашения!');
            if(ctx.session.role === 'worker')
              ctx.scene.enter('workerRoleSelectionScene');
            else if (ctx.session.role === 'customer')
              ctx.scene.enter('customerInfoScene');
        } else {
            ctx.reply('Для продолжения примите соглашение.');
        }
    } else {
      ctx.reply('Пожалуйста, используйте кнопку выше для принятия соглашения.');
    }
});

  termsScene.action('agreed', async (ctx) => {
    
    if(ctx.session.role === 'worker')
      ctx.scene.enter('workerRoleSelectionScene');
    else if (ctx.session.role === 'customer')
      ctx.scene.enter('customerInfoScene');
  });

module.exports = termsScene;
