const { Scenes, Markup } = require('telegraf');
const { searchTasks, getAllTasks } = require('../utils/task'); // Предполагаемая функция для API-запроса поиска заданий
const { updateUserSceneStep } = require('../utils/user');
const { updateStep, tryGetMetroStation } = require('../utils/common');
const { message } = require('telegraf/filters');

const searchTaskScene = new Scenes.BaseScene('searchTaskScene');

searchTaskScene.enter(async (ctx) => {
    ctx.session.searchFilters = {};
    await updateStep(
        ctx, 
        'choose_filter',
        'Выберите фильтр для поиска заданий:',
        Markup.inlineKeyboard([
            [Markup.button.callback('По фразе в названии/описании', 'filter_phrase')],
            [Markup.button.callback('По размеру оплаты', 'filter_payment')],
            [Markup.button.callback('По ближайшей станции метро', 'filter_metro')],
            [Markup.button.callback('Показать задания', 'search_tasks')],
            [Markup.button.callback('Отмена', 'cancel')]
        ])
    )
});

searchTaskScene.action('filter_phrase', async (ctx) => {
    ctx.session.step = 'enter_phrase';
    await ctx.reply('Введите фразу для поиска в названии или описании:');
});

searchTaskScene.action('filter_payment', async (ctx) => {
    ctx.session.step = 'enter_payment';
    await ctx.reply('Введите минимальную и максимальную сумму оплаты через дефис (например, "1000-5000"):');
});

searchTaskScene.action('filter_metro', async (ctx) => {
    await ctx.reply('Фильтр по метро пока недоступен');
    ctx.scene.reenter();
    //ctx.session.step = 'enter_metro';
    //await ctx.reply('Введите название ближайшей станции метро:');
});

searchTaskScene.action('search_tasks', async (ctx) => {
    try {
        const tasks = await searchTasks(ctx.session.searchFilters); // Функция, выполняющая запрос к API
        console.log(tasks);
        if (tasks.length === 0) {
            await ctx.reply('По вашему запросу заданий не найдено.');
        } else {
            const buttons = tasks.map((task) =>
                Markup.button.callback(task.title, `task_${task.id}`)
            );
            await ctx.reply(
                'Найденные задания:',
                Markup.inlineKeyboard(buttons, { columns: 1 })
            );
        }
    } catch (error) {
        console.error('Ошибка при поиске заданий:', error);
        await ctx.reply('Произошла ошибка при поиске заданий. Попробуйте позже.');
    }
});

searchTaskScene.action(/task_(\d+)/, async (ctx) => {
    const taskId = ctx.match[1];
    ctx.session.selectedTaskId = taskId;

    try {
        const tasks = await getAllTasks();
        const taskDetails = tasks.find(t => t.id === Number(taskId));
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

searchTaskScene.action(/task_details_(\d+)/, async (ctx) => {
    const taskId = ctx.match[1];
    
    try {
        const tasks = await getAllTasks();
        const taskDetails = tasks.find(t => t.id === Number(taskId));
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

searchTaskScene.action(/take_task_(\d+)/, async (ctx) => {
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

searchTaskScene.action('cancel_task_view', async (ctx) => {
    ctx.session.selectedTaskId = null;
    await ctx.reply('Выбор задания отменён.');
    await ctx.scene.reenter(); // Возвращение к списку задач
});

searchTaskScene.action('cancel', async (ctx) => {
    await ctx.scene.leave();
    await ctx.reply('Поиск заданий отменён.');
});

searchTaskScene.on(message('text'), async (ctx) => {
    const input = ctx.message.text;

    switch (ctx.session.step) {
        case 'enter_phrase':
            ctx.session.searchFilters.phrase = input;
            await updateStep(
                ctx, 
                'choose_filter',
                'Фраза добавлена. Выберите следующий фильтр или начните поиск.', 
                Markup.inlineKeyboard([
                    [Markup.button.callback('Показать задания', 'search_tasks')],
                    [Markup.button.callback('Добавить ещё фильтры', 'choose_filter')]
                ])
            );
            break;

        case 'enter_payment':
            const [min, max] = input.split('-').map(Number);
            if (!min || !max || min >= max) {
                await ctx.reply('Введите корректный диапазон (например, "1000-5000").');
                return;
            }
            ctx.session.searchFilters.payment = { min, max };
            await updateStep(
                ctx, 
                'choose_filter',
                'Фильтр оплаты добавлен. Выберите следующий фильтр или начните поиск.', 
                Markup.inlineKeyboard([
                    [Markup.button.callback('Показать задания', 'search_tasks')],
                    [Markup.button.callback('Добавить ещё фильтры', 'choose_filter')]
                ])
            );
            break;

        case 'enter_metro':
            if(tryGetMetroStation(input)) {
                ctx.session.searchFilters.metro = input;
                await updateStep(
                    ctx, 
                    'choose_filter',
                    'Станция метро добавлена. Выберите следующий фильтр или начните поиск.', 
                    Markup.inlineKeyboard([
                        [Markup.button.callback('Показать задания', 'search_tasks')],
                        [Markup.button.callback('Добавить ещё фильтры', 'choose_filter')]
                    ])
                )
            } else {
                await updateStep(
                    ctx, 
                    'choose_filter',
                    'Станция метро не найдена. Выберите следующий фильтр или начните поиск.', 
                    Markup.inlineKeyboard([
                        [Markup.button.callback('Показать задания', 'search_tasks')],
                        [Markup.button.callback('Добавить ещё фильтры', 'choose_filter')]
                    ])
                );
            }
            break;

        default:
            await ctx.reply('Выберите фильтр для поиска.');
            break;
    }
});

module.exports = searchTaskScene;
