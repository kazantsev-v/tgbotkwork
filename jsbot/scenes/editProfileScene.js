const { Scenes, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const { 
    generateTimeKeyboard, 
    generateWeekdayKeyboard, 
    generateWorkDaysKeyboard, 
    daysOfWeek 
} = require('../utils/keyboards');
const { updateUserSceneStep } = require('../utils/user');
const { updateStep } = require('../utils/common');
const { metro_stations } = require('../models/common');


const editProfileScene = new Scenes.BaseScene('editProfileScene');
let isCustomer;
// Отображение полей в зависимости от роли
const fieldsForCustomer = {
    fullName: 'ФИО',
    photo: 'Фото',
    companyName: 'Название компании',
    phone: 'Телефон',
    additionalContacts: 'Доп. Контакты',
    documentPath: 'Реквизиты'
};

const fieldsForWorker = {
    fullName: 'ФИО',
    photo: 'Фото',
    metroStation: 'Станция метро',
    location: 'Геолокация',
    address: 'Адрес',
    paymentDetails: 'Детали оплаты',
    workDays: 'Рабочие дни',
    startTime: 'Время начала',
    endTime: 'Время окончания',
    phone: 'Телефон',
    role: 'Роль',
};

// Заглушка для обновления данных в базе
async function updateProfile(userId, updatedData) {
    console.log(`Обновляем профиль пользователя ${userId} с данными:`, updatedData);
    // Реализовать обновление в БД
}

// Вход в сцену
editProfileScene.enter(async (ctx) => {
    isCustomer = ctx.session.role === 'customer';
    const fields = isCustomer ? fieldsForCustomer : fieldsForWorker;

    await updateStep(
        ctx, 
        'choose',
        'Что вы хотите изменить?',
        Markup.inlineKeyboard(
            Object.entries(fields).map(([key, label]) => [
                Markup.button.callback(label, `edit_${key}`),
            ]).concat([[Markup.button.callback('Назад', 'back_to_profile')]])
        ).resize(2)
    )
});

// Обработчик редактирования полей
editProfileScene.action(/^edit_(.+)$/, async (ctx) => {
    const field = ctx.match[1];
    ctx.session.editField = field;

    const fields = ctx.session.role === 'customer' ? fieldsForCustomer : fieldsForWorker;
    const fieldLabel = fields[field] || 'Неизвестное поле';

    switch (field) {
        case 'photo':
            await updateStep(ctx, 'photo', 'Пришлите новое фото.')
            break;

        case 'workDays':
            await updateStep(ctx, 'workDays', 'Выберите новые рабочие дни в формате.', generateWorkDaysKeyboard(ctx.session.workerInfo.workDays))
            break;

        case 'startTime':
            await updateStep(
                ctx, 
                'startTime', 
                'Выберите начало рабочего времени:', 
                await generateTimeKeyboard()
            )
            break;
            
        case 'endTime':
            await updateStep(
                ctx, 
                'endTime', 
                'Выберите конец рабочего времени:', 
                await generateTimeKeyboard()
            )
            break;

        case 'role':
            ctx.session.step = 'roleChange'
            await ctx.scene.enter("workerRoleSelectionScene");
            break;
        case 'documentPath':
            await ctx.scene.enter("roleInfoScene");
            break;
        case 'address':
            await updateStep(ctx, 'direct_address', 'Введите адрес: ', Markup.removeKeyboard())
            break;
        case 'location':
            await updateStep(
                ctx, 
                'location', 
                'Предоставьте местоположение', 
                Markup.keyboard([
                    Markup.button.locationRequest('🌍Поделится геолокацией'),
                    Markup.button.callback('📎Прикрепить геопозицию', 'g_location'),
                ]));
            break;
        case 'paymentDetails':
            await updateStep(
                ctx, 
                'paymentMethod', 
                'Выберите реквизит для оплаты:', 
                Markup.keyboard([
                    Markup.button.callback('СБП', 'sbp'),
                    Markup.button.callback('Номер Карты', 'card'),
                ])
            );
            break;
        default:
            ctx.scene.state.awaitingInput = true;
            await ctx.reply(
                `Введите новое значение для поля "${fieldLabel}":`,
                Markup.keyboard([['Отменить']]).resize())
            break;
    }
});

// Обработчик для текста (изменение поля)
editProfileScene.on(message('text'), async (ctx) => {
    if (ctx.message.text === 'Отменить') {
        await ctx.reply('Изменение отменено.', Markup.removeKeyboard());
        return ctx.scene.reenter();
    }

    if (ctx.message.text === 'Назад') {
        await ctx.scene.enter('profileScene');
        return ctx.scene.reenter();
    }

    // Обработка выбора метода оплаты
    if (ctx.session.step === 'paymentMethod') {
        if (ctx.message.text === 'СБП') {
            await updateStep(
                ctx, 
                'sbpNumber',
                'Введите номер телефона, привязанный к СБП:'
            );
            return;
        } else if (ctx.message.text === 'Номер Карты') {
            await updateStep(
                ctx, 
                'cardNumber',
                'Введите номер карты:'
            );
            return;
        }
    }
    
    // Обработка ввода СБП номера
    if (ctx.session.step === 'sbpNumber') {
        if (validateSBP(ctx.message.text)) {
            ctx.session.workerInfo.paymentDetails = `СБП: ${ctx.message.text}`;
            await updateStep(
                ctx, 
                'choose',
                'Реквизиты для оплаты успешно обновлены.'
            );
            ctx.scene.state.awaitingInput = false;
            return ctx.scene.reenter();
        } else {
            await ctx.reply('Некорректный номер телефона для СБП. Введите в формате +7ХХХХХХХХХХ или 8ХХХХХХХХХХ');
            return;
        }
    }
    
    // Обработка ввода номера карты
    if (ctx.session.step === 'cardNumber') {
        if (validateCardNumber(ctx.message.text)) {
            ctx.session.workerInfo.paymentDetails = `Карта: ${ctx.message.text}`;
            await updateStep(
                ctx, 
                'choose',
                'Реквизиты для оплаты успешно обновлены.'
            );
            ctx.scene.state.awaitingInput = false;
            return ctx.scene.reenter();
        } else {
            await ctx.reply('Введите корректный номер карты (16 цифр).');
            return;
        }
    }

    if (ctx.message.text === '📎Прикрепить геопозицию') {
        await ctx.reply('🌍Пожалуйста, отправьте геопозицию. 📎Прикрепить → 🌍Геопозиция', Markup.removeKeyboard());
        return;
    }

    if (ctx.scene.state.awaitingInput) {
        const field = ctx.session.editField;
        const newValue = ctx.message.text;

        // Обновляем данные в сессии (или в базе данных)
        ctx.session[isCustomer?"customerInfo":"workerInfo"] = ctx.session[isCustomer?"customerInfo":"workerInfo"] || {};
        ctx.session[isCustomer?"customerInfo":"workerInfo"][field] = newValue;

        await updateProfile(ctx.from.id, { [field]: newValue });

        const fields = ctx.session.role === 'customer' ? fieldsForCustomer : fieldsForWorker;
        const fieldLabel = fields[field] || 'Неизвестное поле';

        await ctx.reply(`Поле "${fieldLabel}" успешно обновлено на "${newValue}".`);
        ctx.scene.state.awaitingInput = false;

        return ctx.scene.reenter();
    }
});

editProfileScene.on(message('location'), async (ctx, next) => {
    console.log('in location handler');
    ctx.session.workerInfo.location = {
        latitude: ctx.message.location.latitude, 
        longitude: ctx.message.location.longitude
    };
    await updateProfile(ctx.from.id, { [field]: newValue });
    await ctx.reply(`Поле "${fieldsForWorker[ctx.session.editField]}" успешно обновлено на "${ctx.session.workerInfo.location}".`);
    ctx.session.step = 'choose';
    ctx.scene.state.awaitingInput = false;
    return ctx.scene.reenter();
});

editProfileScene.action(/time_(\d+)/, async (ctx) => {
    const selectedTime = parseInt(ctx.match[1]);
    if(ctx.session.step === 'startTime') {
        ctx.session.workerInfo.startTime = selectedTime;
        await updateStep(
            ctx, 
            'choose', 
            `Ваш новый рабочий интервал: с ${ctx.session.workerInfo.startTime}:00 до ${ctx.session.workerInfo.endTime}:00.`
        )
        ctx.scene.state.awaitingInput = false;
        return ctx.scene.reenter();
    } else if (ctx.session.step === 'endTime') {       
        ctx.session.workerInfo.endTime = selectedTime;
        await updateStep(
            ctx, 
            'choose', 
            `Ваш новый рабочий интервал: с ${ctx.session.workerInfo.startTime}:00 до ${ctx.session.workerInfo.endTime}:00.`
        )
        ctx.scene.state.awaitingInput = false;
        return ctx.scene.reenter();
    }
});

editProfileScene.action(/day_(\w+)/, async (ctx) => {
    const selectedDay = ctx.match[1];
    if(!ctx.session.workerInfo.workDays) ctx.session.workerInfo.workDays = []
    const workDays = ctx.session.workerInfo.workDays;

    // Если день выбран, то удаляем его, если нет - добавляем
    if (workDays.includes(selectedDay)) {
        ctx.session.workerInfo.workDays = workDays.filter(day => day !== selectedDay);
    } else {
        ctx.session.workerInfo.workDays.push(selectedDay);
    }

    // Обновление сообщения с клавиатурой
    try {
        await ctx.editMessageText(
            'Выберите рабочие дни:',
            { reply_markup: generateWorkDaysKeyboard(ctx.session.workerInfo.workDays).reply_markup }
        );
    } catch (error) {
        // Если клавиатура пропала, отправляем новое сообщение
        await ctx.reply('Выберите рабочие дни:', generateWorkDaysKeyboard(ctx.session.workerInfo.workDays));
    }
});

editProfileScene.action('confirm_days', async (ctx) => {
    if (ctx.session.workerInfo.workDays && ctx.session.workerInfo.workDays.length > 0) {
        await updateStep(
            ctx, 
            'choose', 
            await ctx.reply(`Вы выбрали рабочие дни: ${ctx.session.workerInfo.workDays.map(day => {
                return daysOfWeek.find(d => d.id === day).text
            }).join(', ')}`)
        )
        ctx.scene.state.awaitingInput = false;
        return ctx.scene.reenter();
    } else {
        await ctx.reply('Вы не выбрали рабочие дни!', Markup.keyboard([['Отменить']]).resize());
    }
});

// Кнопка "Назад"
editProfileScene.action('back_to_profile', async (ctx) => {
    await ctx.scene.enter('profileScene');
});

editProfileScene.on(message('photo'), async (ctx) => {
    if(ctx.session.step === 'photo') {
        const photo = ctx.message.photo.pop();
        ctx.session[isCustomer?"customerInfo":"workerInfo"].photo = photo.file_id;
        await updateStep(
            ctx, 
            'choose',
            'Фото изменено'
        );
        ctx.scene.state.awaitingInput = false;
        return ctx.scene.reenter();
    } else {
        await ctx.reply('Неверный ввод', Markup.keyboard([['Отменить']]).resize());
    }
});

module.exports = editProfileScene;
