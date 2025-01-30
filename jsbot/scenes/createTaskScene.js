const { Scenes, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const { 
    generateDateKeyboard2, 
    generateTimeKeyboard
} = require('../utils/keyboards');
const { 
    validateText, 
    validateNumericValue 
} = require('../utils/validators');
const { 
    getNearestMetroStation, 
    getStationCoordinates, 
    updateStep,
    convertTimeToDbFormat,
    createReminder
} = require('../utils/common');
const { 
    updateUserSceneStep,
    getUsersProfile
} = require('../utils/user');
const { 
    uploadTaskPhotos, 
    createTask
} = require('../utils/task');
const { Reminder } = require('../models/reminder');

const createTaskScene = new Scenes.BaseScene('createTaskScene');

const options = [
    { key: 'pack', label: 'Упаковка нашим материалом', description: 'Введите описание упаковки:' },
    { key: 'tool', label: 'Дополнительный инструмент', description: 'Введите описание инструмента:' },
    { key: 'assemble', label: 'Сборка/разборка', description: 'Введите описание сборки/разборки:' }
];

const descriptionSteps = [
    { key: 'pack', description: 'Описание упаковки добавлено.' },
    { key: 'tool', description: 'Описание инструмента добавлено.' },
    { key: 'assemble', description: 'Описание сборки/разборки добавлено.' }
];

createTaskScene.enter(async (ctx) => {
    ctx.session.task = { dates: [] };

    ctx.session.help = {
        year: (new Date()).getFullYear(),
        month: (new Date()).getMonth()
    }
    await updateStep(ctx, 'title', 'Введите название задания:');
});

createTaskScene.on(message('text'), async (ctx) => {
    const input = ctx.message.text;

    switch (ctx.session.step) {
        case 'title':
            if (validateText(input)) {
                ctx.session.task.title = input;
                await updateStep(ctx, 'description', 'Введите описание задания:');
            } else {
                await ctx.reply('Название введено некорректно. Попробуйте ещё раз.');
            }
            break;
        case 'description':
            if (validateText(input)) {
                ctx.session.task.description = input;
                await updateStep(
                    ctx, 
                    'location', 
                    'Введите адрес места выполнения:'
                );
            } else {
                await ctx.reply('Описание введено некорректно. Попробуйте ещё раз.');
            }
            break;
        case 'location':
            if (validateText(input)) {
                ctx.session.task.location = input;
                await updateStep(
                    ctx, 
                    'choose_dates', 
                    'Выберите даты выполнения:', 
                    generateDateKeyboard2((new Date()).getMonth(), (new Date()).getFullYear())
                );
            } else {
                await ctx.reply('Локация введена некорректно. Попробуйте ещё раз.');
            }
            break;
        case 'payment':
            if (validateNumericValue(input)) {
                ctx.session.task.payment = input;
                await updateStep(ctx, 'duration', 'Введите количество рабочих часов:');
            } else {
                await ctx.reply('Сумма вознаграждения введена некорректно. Попробуйте ещё раз.');
            }
            break;
        case 'duration':
            if (validateNumericValue(input)) {
                ctx.session.task.duartion = input;
                await updateStep(
                    ctx, 
                    'options', 
                    'Выберите дополнительные опции:',
                    generateOptionsKeyboard()
                );
            } else {
                await ctx.reply('Количество рабочих часов введено некорректно. Попробуйте ещё раз.');
            }
            break;
        case 'options':
            await ctx.reply('Выберите дополнительные опции:',generateOptionsKeyboard())
            break;
        case 'photos':
            console.log(ctx.message.text.toLowerCase());
            if (ctx.message.text.toLowerCase() === 'пропустить') {
                await updateStep(ctx, 'moderator_description', 'Введите описание для модератора:');
            } else {
                await ctx.reply('Введите "Пропустить", если фото не требуется.');
            }
            break;
        case 'moderator_description':
            ctx.session.task.moderator_description = input;
            await finishTaskCreation(ctx);
            break;
        default:
            const currentStep = ctx.session.step;

            const step = descriptionSteps.find(desc => currentStep === `${desc.key}_description`);
            if (step) {
                ctx.session.task[`${step.key}_description`] = input;
                await updateStep(
                    ctx, 
                    'options', 
                    step.description
                );
                await ctx.reply('Выберите дополнительные опции:',generateOptionsKeyboard())
            }
            break;
    }
});

createTaskScene.action(/option_(.+)/, async (ctx) => {
    const optionKey = ctx.match[1];
    const option = options.find(opt => opt.key === optionKey);

    if (option) {
        const isEnabled = ctx.session.task[option.key] || false;
        ctx.session.task[option.key] = !isEnabled;

        await ctx.reply(`${option.label}: ${!isEnabled ? 'Выбрано' : 'Снято'}`);
        if (!isEnabled) {
            await updateStep(ctx, `${option.key}_description`, option.description);
        }
    }
});

createTaskScene.action('finish_options', async (ctx) => {
    await updateStep(ctx, 'photos', 'Загрузите фото, если требуется.', Markup.keyboard([['Пропустить']]));
});

createTaskScene.action(/date_\d+_\d+_\d+/, async (ctx) => {
    console.log(ctx.match[0], ctx.match[0].split('_').slice(1).map(Number))
    const [day, month, year] = ctx.match[0].split('_').slice(1).map(Number);
    const date = new Date(year, month-1, day+1).toISOString().split('T')[0];
    console.log(date)

    if (ctx.session.task.dates.includes(date)) {
        ctx.session.task.dates = ctx.session.task.dates.filter(d => d !== date);
    } else {
        ctx.session.task.dates.push(date);
    }

    console.log((new Date()).getMonth(), (new Date()).getFullYear());
    await ctx.editMessageText(
        `Выбранные даты: ${ctx.session.task.dates.join(', ')}`,
        {
            reply_markup: generateDateKeyboard2(ctx.session.help.month, ctx.session.help.year, true).reply_markup
        }
    );
});

// Переключение месяца/года
createTaskScene.action(/change_(prev|next)_(month|year)_(\d+)_(\d+)/, async (ctx) => {
    const [direction, unit, month, year] = ctx.match.slice(1);
    let newMonth = parseInt(month, 10);
    let newYear = parseInt(year, 10);

    if (unit === 'month') {
        newMonth += direction === 'next' ? 1 : -1;
        if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        } else if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        }
    } else if (unit === 'year') {
        newYear += direction === 'next' ? 1 : -1;
    }
    ctx.session.help.month = newMonth;
    ctx.session.help.year = newYear;

    await ctx.editMessageText(
        `Выберите дату выполнения:\n`,
        await generateDateKeyboard2(ctx.session.help.month, ctx.session.help.year, true)
    );
});

createTaskScene.action('finish_dates', async (ctx) => {
    if (ctx.session.task.dates.length === 0) {
        await ctx.reply('Вы не выбрали ни одной даты. Попробуйте ещё раз.');
    } else {
        await updateStep(ctx, 'choose_time', 'Выберите время начала исполнения заказа:', generateTimeKeyboard());
    }
});

createTaskScene.action(/time_(\d+)/, async (ctx) => {
    console.log('in time handler')
    ctx.session.task.time = ctx.match[0].split('_')[1];
    await updateStep(ctx, 'payment', 'Введите сумму вознаграждения:');
});

createTaskScene.on(message('photo'), async (ctx) => {
    ctx.session.task.photos = ctx.session.task.photos || [];
    const photo = ctx.message.photo.pop();
    ctx.session.task.photos.push(photo.file_id);

    await ctx.reply('Фото добавлено. Вы можете загрузить ещё или завершить.', 
        Markup.inlineKeyboard([
            [Markup.button.callback('Загрузить еще', 'finish_options')],
            [Markup.button.callback('Завершить загрузку фото', 'end_photo_picking')]
        ]));
});

createTaskScene.action('end_photo_picking', async (ctx) => {
    await updateStep(ctx, 'moderator_description', 'Введите описание для модератора:', Markup.removeKeyboard());
});


createTaskScene.action('end_task_creation', async (ctx) => {
    await finishTaskCreation(ctx);
});

async function finishTaskCreation(ctx) {
    ctx.session.task.status = 'pending';
    ctx.session.task.created_at = new Date();
    try {
        const user = await getUsersProfile(ctx.session.telegramId);
        const task = await createTask(user, ctx.session.task);
        if(ctx.session.task.photos)
            await uploadTaskPhotos(ctx, task.id, ctx.session.task.photos);
        console.log('Созданное задание:', task);
        await createRemindersForTask(ctx, task)
        await ctx.reply('Задание успешно создано и отправлено на модерацию.');
    } catch (error) {
        throw error;
    }
    
    await ctx.scene.enter('mainScene')
}

async function createRemindersForTask(ctx, task) {
    /*const reminders = [];
    const user = await getUsersProfile(ctx.session.telegramId);
    const startDate = new Date(findEarliestDate(task.dates));
    for(let i = 0; i < 6; i++) {
        const reminderDate = new Date(startDate.getTime() - i * 30 * 60 * 1000);
        reminders.push(new Reminder(
            null,
            user,
            `Ваше задание начинается через ${(i > 1) ? Math.ceil(i/2) + 'ч':''} ${i*30%60} минут. Вы готовы выйти?`,
            reminderDate
        ))
    }
    reminders.forEach(async reminder => {
        try {
            await createReminder(reminder);
        } catch (err) {
            console.error(err);
        }
    }) */
}

function generateOptionsKeyboard() {
    return Markup.inlineKeyboard([
        ...options.map(opt => [Markup.button.callback(opt.label, `option_${opt.key}`)]),
        [Markup.button.callback('Закончить выбор', 'finish_options')]
    ]);
}

const findEarliestDate = (dates) => {
    console.log(dates, dates.reduce((earliest, current) => {
        return new Date(current) < new Date(earliest) ? current : earliest;
    }));
    return dates.reduce((earliest, current) => {
        return new Date(current) < new Date(earliest) ? current : earliest;
    });
};

module.exports = createTaskScene;