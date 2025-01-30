const { Scenes, Markup } = require('telegraf');
const { updateUserSceneStep } = require('../utils/user');

// Сцена статистики рабочего
const workerStatsScene = new Scenes.BaseScene('workerStatsScene');

// Данные статистики (замени на получение данных из БД)
const workerStats = {
    completedTasks: 125,
    failedTasks: 1,
    declinedTasks: 4,
    skippedTasks: 3,
    rating: 4.7, // Рейтинг от 1 до 5
    bonusPoints: 1200, // Примерная система бонусов
};

workerStatsScene.enter(async (ctx) => {
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    // Формирование сообщения со статистикой
    const statsMessage = `
    <b>Ваша статистика:</b>
    ✅ Успешно выполнено: ${ctx.session.workerInfo.completedTasks}
    ❌ Провалено: ${ctx.session.workerInfo.lateTasks}
    🚫 Отказов: ${ctx.session.workerInfo.declinedTasks}
    ⭐ Рейтинг: ${ctx.session.workerInfo.rating.toFixed(1)} / 5
    🎁 Бонусные очки: ${ctx.session.workerInfo.bonus}

    Работайте эффективно и увеличивайте свой рейтинг!`;

    // Кнопки для действий
    const statsButtons = Markup.inlineKeyboard([
        [Markup.button.callback('Назад', 'back_to_main')],
    ]);

    await ctx.replyWithHTML(statsMessage, statsButtons);
});

// Обработка кнопки "Назад"
workerStatsScene.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.scene.enter('mainScene');
});

module.exports = workerStatsScene;
