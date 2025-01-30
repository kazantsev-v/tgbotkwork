const { Scenes, Markup } = require('telegraf');
const { 
    updateUserSceneStep
} = require('../utils/user');
const { 
    updateStep
} = require('../utils/common');
const { 
    getTaskById, 
    getTasksByCreatorId, 
    getPhotosByTaskId 
} = require('../utils/task');

function formatDate(date) {
    return new Date(date).toLocaleString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function loadTasks(ctx) {
    if(!ctx?.session) throw Error('no session/context in loadTask function');
    const tasks = await getTasksByCreatorId(ctx.session.userId);
    if(!tasks.length) return [];
    tasks.map(async task => {
        const photos = await getPhotosByTaskId(task.id);
        return {task, photos};
    })
    return tasks;
}

async function showTasks(ctx, tasks) {
    const buttons = tasks.map((task) =>
        Markup.button.callback(task.title, `view_task_${task.id}`)
    );

    await ctx.reply('Список заданий:', Markup.inlineKeyboard(buttons, { columns: 1 }));
}

const customerTasksScene = new Scenes.BaseScene('customerTasksScene');

// Вход в сцену
customerTasksScene.enter(async (ctx) => {
    const tasks = await loadTasks(ctx);
    if (!tasks.length) {
        await updateStep(
            ctx, 
            'showTasks',
            'У вас пока нет заданий.', 
            Markup.keyboard([['Назад']]).resize()
        );
    } else {
        await updateStep(
            ctx, 
            'showTasks',
            'Выберите задание чтобы увидеть подробности:', 
            Markup.keyboard([['Назад']]).resize()
        );
    }

    await showTasks(ctx, tasks);
});

customerTasksScene.hears('Назад', async (ctx) => {
    if(ctx.session.step = 'showTasks')
        await ctx.scene.enter('mainScene');
    else {
        const tasks = await loadTasks(ctx);
        if (!tasks.length) {
            await updateStep(
                ctx, 
                'showTasks',
                'У вас пока нет заданий.', 
                Markup.keyboard([['Назад']]).resize()
            );
        } else {
            await updateStep(
                ctx, 
                'showTasks',
                'Выберите задание чтобы увидеть подробности:', 
                Markup.keyboard([['Назад']]).resize()
            );
        }
        await showTasks(ctx, tasks);
    }
});

customerTasksScene.action(/^view_task_\d+$/, async (ctx) => {
    ctx.session.step = 'viewTask';
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    
    const tasks = await loadTasks(ctx);
    const taskId = parseInt(ctx.match[0].split('_')[2]);
    const task = tasks.find(task => task.id === taskId);
    if(task)
        task.photos = task.photos;

    if (!task) {
        return ctx.reply('Задание не найдено.');
    }

    await ctx.replyWithHTML(
        `<b>Подробная информация о задании:</b>\n\n` +
        `<b>Название:</b> ${task.title}\n` +
        `<b>Описание:</b> ${task.description}\n` +
        `<b>Оплата:</b> ${task.payment}\n` +
        `<b>Упаковка нашим материалом:</b> ${task.pack_needed ? `Да (${task.pack_description})` : 'Нет'}\n` +
        `<b>Дополнительный инструмент:</b> ${task.tool_needed ? `Да (${task.tool_description})` : 'Нет'}\n` +
        `<b>Сборка/Разборка:</b> ${task.assemble_needed ? `Да (${task.assemble_description})` : 'Нет'}\n` +
        `<b>Дата создания:</b> ${formatDate(task.created_at)}\n` +
        `<b>Описание для модератора:</b> ${task.moderator_description}\n` +
        `<b>Местоположение:</b> ${task.location}\n` +
        `<b>Даты исполнения:</b> ${task.dates.join(' ')}\n` +
        `<b>Время начала:</b> ${task.start_time}\n` +
        `<b>Количество рабочих часов:</b> ${task.duration} ч\n` +
        `<b>Исполнитель:</b> ${task.executor.name || 'не назначен'}\n` +
        `<b>Статус:</b> ${task.status}\n`
    );

    if (task.photos && task.photos.length) {
        for (const photo of task.photos) {
            if (!photo.startsWith("http")) {
                await ctx.replyWithPhoto(photo);
            } else {
                await ctx.replyWithPhoto({ url: photo });
            }
        }
    }
});

module.exports = customerTasksScene;
