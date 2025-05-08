const { Scenes, Markup } = require('telegraf');
const { getReminders } = require('../utils/common');

// Форматирование даты
function formatDate(dateStr) {
    return new Date(dateStr).toLocaleString('ru-RU', {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
}

const remindersScene = new Scenes.BaseScene('remindersScene');

remindersScene.enter(async (ctx) => {
    try {
        const userId = ctx.session.userId;
        const reminders = await getReminders(userId);
        if (!reminders || reminders.length === 0) {
            await ctx.reply('У вас нет активных напоминаний.');
        } else {
            for (const rem of reminders) {
                await ctx.replyWithHTML(
                    `<b>Напоминание:</b> ${rem.message}\n` +
                    `<b>Время:</b> ${formatDate(rem.remindAt)}`
                );
            }
        }
    } catch (error) {
        console.error('Ошибка при загрузке напоминаний:', error);
        await ctx.reply('Не удалось загрузить напоминания. Попробуйте позже.');
    }
    await ctx.reply('Вернуться к меню:', Markup.inlineKeyboard([[Markup.button.callback('Назад', 'back_to_main')]]));
});

remindersScene.action('back_to_main', async (ctx) => {
    await ctx.scene.enter('mainScene');
});

module.exports = remindersScene;
