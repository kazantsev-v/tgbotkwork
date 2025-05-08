const { Scenes, Markup } = require('telegraf');
const  { daysOfWeek } = require('../utils/keyboards');
const { updateUserSceneStep, updateUserBalance } = require('../utils/user');
const { updateStep } = require('../utils/common');
const { sendKeyboard, clearKeyboard } = require('../utils/keyboardManager');

function formatWorkDays(workDays) {
    return workDays.map(day => daysOfWeek.find(d => d.id === day).text).join(', ');
}

// Функция для правильного форматирования данных о машине
function formatVehicleData(vehicle) {
    if (!vehicle) return 'Нет данных';
    
    let result = '\n';
    
    // Используем простые символы вместо HTML-тегов для списка
    if (vehicle.length) result += '• Длина: ' + vehicle.length + ' см\n';
    if (vehicle.width) result += '• Ширина: ' + vehicle.width + ' см\n';
    if (vehicle.height) result += '• Высота: ' + vehicle.height + ' см\n';
    if (vehicle.volume) result += '• Объем: ' + vehicle.volume + ' м³\n';
    if (vehicle.maxWeight) result += '• Макс. вес: ' + vehicle.maxWeight + ' кг\n';
    if (vehicle.type) result += '• Тип: ' + vehicle.type + '\n';
    
    return result;
}

// Функция для безопасного форматирования профиля пользователя
function formatProfileMessage(profile) {
    try {
        // Форматированное сообщение профиля
        let message = `<b>${profile.name || 'Имя не указано'}</b>\n`;
        message += `<b>Станция метро:</b> ${profile.metroStation || '-'}\n`;
        message += `<b>Реквизиты:</b> ${profile.requisites || '-'}\n`;
        message += `<b>Телефон:</b> ${profile.phone || '-'}\n`;
        message += `<b>Баланс:</b> ${profile.balance || 0}\n`;
        message += `<b>Рабочие дни:</b> ${profile.workingDays || '-'}\n`;
        message += `<b>Время работы:</b> ${profile.workingHours || '-'}\n`;
        
        // Безопасно добавляем поля, которые могут быть undefined
        if (profile.weeklyIncome !== undefined) 
            message += `<b>Еженедельный доход:</b> ${profile.weeklyIncome}\n`;
        if (profile.bonuses !== undefined) 
            message += `<b>Бонусы:</b> ${profile.bonuses}\n`;
        if (profile.rating !== undefined) 
            message += `<b>Рейтинг:</b> ${profile.rating}\n`;
        
        // Форматируем данные о машине правильно
        if (profile.vehicle) {
            message += `<b>Машина:</b>${formatVehicleData(profile.vehicle)}`;
        }
        
        return message;
    } catch (error) {
        console.error('Ошибка при форматировании сообщения профиля:', error);
        return '<b>Ошибка при генерации профиля</b>\nПожалуйста, попробуйте позже или обратитесь в поддержку.';
    }
}

const profileScene = new Scenes.BaseScene('profileScene');

profileScene.enter(async (ctx) => {
    try {
        // Сначала очищаем предыдущую клавиатуру
        await clearKeyboard(ctx, 'Загрузка профиля...');
        
        await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
        const role = ctx.session.role;
        const isCustomer = ctx.session.role === 'customer'; // Проверяем роль
        
        // Проверка на существование профиля
        if (!ctx.session.customerInfo && !ctx.session.workerInfo) {
            await ctx.reply('Ваш профиль недоступен. Возможно, произошла ошибка в системе. Пожалуйста, попробуйте позже.');
            await ctx.scene.enter('mainScene');
            return;
        }
        
        const userProfile = isCustomer ? ctx.session.customerInfo : ctx.session.workerInfo; // Получаем профиль из сессии

        // Проверяем, существует ли фото в профиле
        if (userProfile && userProfile.photo) {
            try {
                if (!userProfile.photo.startsWith("http")) {
                    await ctx.replyWithPhoto(userProfile.photo);
                } else {
                    pics = String(userProfile.photo).replace(/^http:/, "https:");
                    await ctx.replyWithPhoto({ url: pics });
                }
            } catch (photoError) {
                console.error(`Ошибка при отправке фото пользователя: ${photoError.message}`);
                await ctx.reply('Фото не удалось загрузить.');
            }
        }

        if (isCustomer) {
            // Обработка для клиента с проверкой полей
            if (!userProfile) {
                await ctx.reply('Профиль клиента не найден. Пожалуйста, попробуйте позже.');
                await ctx.scene.enter('mainScene');
                return;
            }

            const { fullName, companyName, phone, additionalContacts, companyDetailsDoc } = userProfile;

            // Создаем сообщение с безопасными проверками
            let message = `<b>${fullName || 'Имя не указано'}</b>\n` +
                `<b>Компания:</b> ${companyName || '-'}\n` +
                `<b>Телефон:</b> ${phone || '-'}\n` +
                `<b>Доп. контакты:</b> ${additionalContacts || '-'}\n` +
                `<b>Баланс:</b> ${ctx.session.balance || 0}\n`;

            if (companyDetailsDoc) {
                if (companyDetailsDoc.startsWith("http")) {
                    message += `<b>Платежные данные:</b> <a href="${companyDetailsDoc}">скачать документ</a>\n`;
                } else {
                    message += `<b>Платежные данные:</b> ${companyDetailsDoc}\n`;
                }
            } else {
                message += `<b>Платежные данные:</b> Не указаны\n`;
            }

            await ctx.replyWithHTML(message);

            if (companyDetailsDoc && companyDetailsDoc.startsWith("http")) {
                try {
                    await ctx.replyWithHTML(`<b>Платежные данные:</b>`);
                    await ctx.replyWithDocument({ url: companyDetailsDoc });
                } catch (docError) {
                    console.error(`Ошибка при отправке документа: ${docError.message}`);
                    await ctx.reply('Не удалось отправить документ с платежными данными.');
                }
            } else if (companyDetailsDoc) {
                await ctx.replyWithHTML(`<b>Платежные данные:</b>\n${companyDetailsDoc}`);
            }

            // Используем sendKeyboard вместо простого reply
            await sendKeyboard(ctx, 'Что вы хотите сделать?', Markup.keyboard([
                ['Изменить данные'], 
                ['Пополнить баланс','Назад']
            ]).resize());
        } else {
            // Обработка для рабочих
            if (!userProfile) {
                await ctx.reply('Профиль работника не найден. Пожалуйста, попробуйте позже.');
                await ctx.scene.enter('mainScene');
                return;
            }

            const { fullName, metroStation, paymentDetails, phone, workDays, startTime, endTime, 
                   weeklyIncome, driverInfo, rating, hasStraps, hasTools, hasFurnitureTools, 
                   workInRegion, bonus } = userProfile;

            // Сформируем сообщение с безопасными проверками всех полей
            let message = `<b>${fullName || 'Имя не указано'}</b>\n` +
                `<b>Станция метро:</b> ${metroStation || '-'}\n` +
                `<b>Реквизиты:</b> ${paymentDetails || '-'}\n` +
                `<b>Телефон:</b> ${phone || '-'}\n` +
                `<b>Баланс:</b> ${ctx.session.balance || 0}\n` +
                `<b>Рабочие дни:</b> ${workDays ? formatWorkDays(workDays) : '-'}\n` +
                `<b>Время работы:</b> ${startTime || '--'}:00 - ${endTime || '--'}:00\n` +
                `<b>Еженедельный доход:</b> ${weeklyIncome || '-'}\n` +
                `<b>Бонусы:</b> ${bonus || '-'}\n` +
                `<b>Рейтинг:</b> ${rating || '-'}\n`;

            // Добавляем информацию в зависимости от роли с дополнительными проверками
            if (role === 'driver' && driverInfo) {
                message += `<b>Машина:</b>${formatVehicleData(driverInfo)}`;
            } else if (role === 'rigger') {
                message += `<b>Cвои ремни:</b> ${hasStraps ? '✅' : '❌'}\n`;
            } else if (role === 'dismantler') {
                message += `<b>Свой инструмент:</b> ${hasTools ? '✅' : '❌'}\n`;
            } else if (role === 'loader') {
            }

            await ctx.replyWithHTML(message);

            // Используем sendKeyboard вместо простого reply
            await sendKeyboard(ctx, 'Что вы хотите сделать?', Markup.keyboard([
                ['Моя статистика', 'Изменить данные'],
                ['Назад']
            ]).resize());
        }
    } catch (error) {
        console.error(`Ошибка в profileScene.enter: ${error.message}`);
        await ctx.reply('Произошла ошибка при загрузке профиля. Пожалуйста, попробуйте позже.');
        await ctx.scene.enter('mainScene');
    }
});

profileScene.hears('Назад', async (ctx) => {
    await ctx.scene.enter('mainScene');
});

profileScene.hears('Изменить данные', async (ctx) => {
    await ctx.scene.enter('editProfileScene');
});

profileScene.hears('Моя статистика', async (ctx) => {
    await ctx.scene.enter('workerStatsScene');
});

profileScene.hears('Пополнить баланс', async (ctx) => {
    ctx.session.balance += 1000;
    // here call API method, generate link to payment and listen callback for payment
    await updateUserBalance(ctx.session.telegramId, ctx.session.balance, ctx);
    await ctx.reply('Баланс пополнен на 1000₽');
    await ctx.scene.reenter();
});

module.exports = profileScene;
