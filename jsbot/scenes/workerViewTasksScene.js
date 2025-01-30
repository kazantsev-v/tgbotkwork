const { Scenes, Markup } = require('telegraf');
const { getTaskById, getAllTasks, takeTask, getAllApprovedTasks } = require('../utils/task');
const { updateUserSceneStep } = require('../utils/user');

function formatDate(date) {
    return new Date(date).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

const workerViewTasksScene = new Scenes.BaseScene('workerViewTasksScene');

workerViewTasksScene.enter(async (ctx) => {
    try {
        const tasks = await getAllApprovedTasks();
        if (tasks.length === 0) {
            await ctx.reply('Пока нет доступных заданий.');
            return await ctx.scene.leave();
        }

        const taskButtons = tasks.map((task) =>
            Markup.button.callback(task.title, `view_task_${task.id}`)
        );

        await ctx.reply(
            'Доступные задания:',
            Markup.inlineKeyboard(taskButtons, { columns: 1 })
        );
    } catch (error) {
        console.error('Ошибка получения задач:', error);
        await ctx.reply('Не удалось загрузить задания. Попробуйте позже.');
        return await ctx.scene.leave();
    }
});

workerViewTasksScene.action(/view_task_(\d+)/, async (ctx) => {
    const taskId = ctx.match[1];
    ctx.session.selectedTaskId = taskId;

    try {
        const tasks = await getAllApprovedTasks();
        const taskDetails = tasks.find(t => t.id === Number(taskId));
        console.log(taskId, taskDetails);
        // TODO: filter tasks to get not all tasks but only available to pick
        await ctx.replyWithHTML(
            `<b>Задание:</b> ${taskDetails.title}\n`,
            Markup.inlineKeyboard([
                [Markup.button.callback('Подробнее', `task_details_${taskId}`)],
                [Markup.button.callback('Взять задание', `take_task_${taskId}`)],
                [Markup.button.callback('Отмена', 'cancel_task_view')]
            ])
        );
    } catch (error) {
        console.error('Ошибка получения деталей задачи:', error);
        await ctx.reply('Не удалось загрузить детали задания. Попробуйте позже.');
    }
});

workerViewTasksScene.action(/task_details_(\d+)/, async (ctx) => {
    const taskId = ctx.match[1];
    
    try {
        const tasks = await getAllApprovedTasks();
        const taskDetails = tasks.find(t => t.id === Number(taskId));
        console.log(taskId, taskDetails);
        await ctx.replyWithHTML(
            `<b>Подробная информация о задании:</b>\n\n` +
            `<b>Название:</b> ${taskDetails.title}\n` +
            `<b>Описание:</b> ${taskDetails.description}\n` +
            `<b>Оплата:</b> ${taskDetails.payment}\n` +
            `<b>Упаковка нашим материалом:</b> ${taskDetails.pack_needed ? `Да (${taskDetails.pack_description})` : 'Нет'}\n` +
            `<b>Дополнительный инструмент:</b> ${taskDetails.tool_needed ? `Да (${taskDetails.tool_description})` : 'Нет'}\n` +
            `<b>Сборка/Разборка:</b> ${taskDetails.assemble_needed ? `Да (${taskDetails.assemble_description})` : 'Нет'}\n` +
            `<b>Дата создания:</b> ${formatDate(taskDetails.created_at)}\n` +
            `<b>Описание для модератора:</b> ${taskDetails.moderator_description}\n` +
            `<b>Местоположение:</b> ${taskDetails.location}\n` +
            `<b>Даты исполнения:</b> ${taskDetails.dates.join(' ')}\n` +
            `<b>Время начала:</b> ${taskDetails.start_time}\n` +
            `<b>Количество рабочих часов:</b> ${taskDetails.duration} ч\n` +
            `<b>Заказчик:</b> ${taskDetails.creator.name || 'не назначен'}\n` +
            `<b>Статус:</b> ${taskDetails.status}\n`,
        );
    } catch (error) {
        console.error('Ошибка получения деталей задачи:', error);
        await ctx.reply('Не удалось загрузить подробности задания. Попробуйте позже.');
    }
});

workerViewTasksScene.action(/take_task_(\d+)/, async (ctx) => {
    const taskId = ctx.match[1];

    try {
        await takeTask(taskId, ctx.session.userId);
        await ctx.reply('Задание успешно принято!');
        await ctx.scene.leave();
    } catch (error) {
        console.error('Ошибка принятия задания:', error);
        await ctx.reply('Не удалось взять задание. Попробуйте позже.');
    }
});

workerViewTasksScene.action('cancel_task_view', async (ctx) => {
    ctx.session.selectedTaskId = null;
    await ctx.reply('Выбор задания отменён.');
    await ctx.scene.reenter(); // Возвращение к списку задач
});

module.exports = workerViewTasksScene;
