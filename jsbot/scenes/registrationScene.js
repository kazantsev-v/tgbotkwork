const { Scenes } = require('telegraf');

const registrationScene = new Scenes.BaseScene('registrationScene');

registrationScene.enter(async (ctx) => {
    const role = ctx.session.role;
    // после принятия условий переносим в нужную сцену сбора данных
    if (role === 'customer') {
        return ctx.scene.enter('customerInfoScene');
    }
    // для всех рабочих – сначала выбрать специализацию
    return ctx.scene.enter('workerRoleSelectionScene');
});

module.exports = registrationScene;
