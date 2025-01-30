// middlewares/newUserMiddleware.js

module.exports = async (ctx, next) => {
    if (!ctx.session.isOldUser) {
        // Это новый пользователь, отправляем на сцену приветствия
        ctx.session.isOldUser = true;  // Устанавливаем флаг для предотвращения повторного перехода
        return ctx.scene.enter('welcomeScene');
    } else {
        return ctx.scene.enter('mainScene');
    }
};
