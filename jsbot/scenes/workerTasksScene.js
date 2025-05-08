const { Scenes, Markup } = require("telegraf");
const { message } = require('telegraf/filters');
const { getTasksByExecutorId, getPhotosByTaskId, declineTask, uploadTaskPhotos, getTaskById } = require("../utils/task");
const { updateStep } = require("../utils/common");
const { updateUserSceneStep } = require("../utils/user");

const workerTasksScene = new Scenes.BaseScene("workerTasksScene");

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
    const tasks = await getTasksByExecutorId(ctx.session.userId);
    // Добавляем проверку на случай, если tasks === undefined или null
    if(!tasks || !tasks.length) return [];
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

workerTasksScene.enter(async (ctx) => {
    try {
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
    } catch (error) {
        console.error("Error fetching tasks:", error);
        await ctx.reply("Произошла ошибка при загрузке заданий.");
        ctx.scene.leave();
    }
});

workerTasksScene.hears('Назад', async (ctx) => {
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


workerTasksScene.action(/^view_task_\d+$/, async (ctx) => {
    const taskId = ctx.match[0].split("_")[1];
    ctx.session.step = 'viewTask';
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);

    try {
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
            `<b>Заказчик:</b> ${task.creator.name || 'не назначен'}\n` +
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

        await ctx.reply(
            `Если вы не сможете выйти на задание нажмите кнопку "Не выйду" ниже`,
            Markup.inlineKeyboard([
                [Markup.button.callback("Не выйду", `decline_${taskId}`)],
                [Markup.button.callback("Загрузить фото", `load_photo_${taskId}`)],
                [Markup.button.callback("Заявить о выполнении", "complete_task")],
                [Markup.button.callback("Назад", "go_back")]
            ])
        );
    } catch (error) {
        console.error("Error fetching task details:", error);
        await ctx.reply("Произошла ошибка при загрузке деталей задания.");
    }
});

workerTasksScene.action(/load_photo_\d+/, async (ctx) => {
    const taskId = ctx.match[0].split("_")[1];
    ctx.session.loadedtask = await getTaskById(taskId);
    await ctx.reply('Загрузите фото');
});

workerTasksScene.on(message('photo'), async (ctx) => {
    ctx.session.loadedtask.photos = ctx.session.loadedtask.photos || [];
    const photo = ctx.message.photo.pop();
    ctx.session.loadedtask.photos.push(photo.file_id);

    await ctx.reply('Фото добавлено. Вы можете загрузить ещё или завершить.', 
        Markup.inlineKeyboard([
            [Markup.button.callback('Загрузить еще', 'load_more')],
            [Markup.button.callback('Завершить загрузку фото', 'end_photo_picking')]
        ]));
});
workerTasksScene.action('load_more', async (ctx) => {
    await ctx.reply('Загрузите фото');
});

workerTasksScene.action('end_photo_picking', async (ctx) => {
    await uploadTaskPhotos(ctx, ctx.session.loadedtask.id, ctx.session.loadedtask.photos);
    await ctx.scene.reenter();
});

workerTasksScene.action(/decline_\d+/, async (ctx) => {
    const taskId = ctx.match[0].split("_")[1];

    try {
        await declineTask(taskId);
        await ctx.reply("Вы отказались от выполнения задания.");
        ctx.scene.reenter();
    } catch (error) {
        console.error("Error declining task:", error);
        await ctx.reply("Произошла ошибка при отказе от задания.");
    }
});

workerTasksScene.action("go_back", async (ctx) => {
    await ctx.scene.leave();
    await ctx.reply("Вы вернулись в главное меню.");
});

module.exports = workerTasksScene;