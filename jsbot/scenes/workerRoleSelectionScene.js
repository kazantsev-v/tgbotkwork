const { Scenes, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const { updateUserSceneStep } = require('../utils/user');

const workerRoleSelectionScene = new Scenes.BaseScene('workerRoleSelectionScene');

workerRoleSelectionScene.enter(async (ctx) => {
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    ctx.reply(
        'Выберите вашу специализацию:',
        Markup.inlineKeyboard([
            [
                Markup.button.callback('Грузчик', 'worker_loader'),
                Markup.button.callback('Такелажник', 'worker_rigger'),
                Markup.button.callback('Разнорабочий', 'worker_handyman')
            ], 
            [
                Markup.button.callback('Водитель', 'worker_driver'),
                Markup.button.callback('Демонтажник', 'worker_dismantler')
            ]
        ])
    );
});

workerRoleSelectionScene.action(/worker_/, async (ctx) => {
    const role = ctx.match.input.split('_')[1]; // Извлечение типа роли
    ctx.session.role = role;
    
    if (ctx.session.step === 'roleChange') {
        // Если это изменение роли, идем в roleInfoScene
        await ctx.scene.enter("roleInfoScene");
    } else {
        // Иначе идем в workerInfoScene для новой регистрации
        await ctx.scene.enter('workerInfoScene');
    }
});

module.exports = workerRoleSelectionScene;
