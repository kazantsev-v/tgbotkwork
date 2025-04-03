const { Scenes, Markup } = require('telegraf');
const  { daysOfWeek } = require('../utils/keyboards');
const { updateUserSceneStep, updateUserBalance } = require('../utils/user');
const { updateStep } = require('../utils/common');

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
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    const role = ctx.session.role;
    const isCustomer = ctx.session.role === 'customer'; // Проверяем роль
    const userProfile = isCustomer ? ctx.session.customerInfo : ctx.session.workerInfo; // Получаем профиль из сессии

    if (userProfile.photo) {
        console.log(userProfile)
        if (!userProfile.photo.startsWith("http")) {
            await ctx.replyWithPhoto(userProfile.photo);
        } else {
            pics = String(userProfile.photo).replace(/^http:/, "https:");
            await ctx.replyWithPhoto({ url: pics});
        }
    }

    if (isCustomer) {
        const { fullName, companyName, phone, additionalContacts, companyDetailsDoc } = userProfile;


        await ctx.replyWithHTML(
            `<b>${fullName}</b>\n` +
            `<b>Компания:</b> ${companyName || '-'}\n` +
            `<b>Телефон:</b> ${phone}\n` +
            `<b>Доп. контакты:</b> ${additionalContacts || '-'}\n` +
            `<b>Баланс:</b> ${ctx.session.balance}\n` +
            `<b>Платежные данные:</b> ${companyDetailsDoc.startsWith("http")?'<a href="'+companyDetailsDoc+'">скачать документ</a>':companyDetailsDoc}\n`
        );
        if(companyDetailsDoc.startsWith("http")) {
            await ctx.replyWithHTML(
                `<b>Платежные данные:</b>`
            );
            await ctx.replyWithDocument({ url: companyDetailsDoc });
        } else {
            await ctx.replyWithHTML(
                `<b>Платежные данные:</b>\n${companyDetailsDoc}`
            );
        }

        await ctx.reply('Что вы хотите сделать?', Markup.keyboard([
            ['Изменить данные'], 
            ['Пополнить баланс','Назад']
        ]).resize());
    } else {
        // Генерация профиля для рабочих
        const { fullName, metroStation, paymentDetails, phone, workDays, startTime, endTime, weeklyIncome, driverInfo, rating, hasStraps, hasTools, hasFurnitureTools, workInRegion, bonus } = userProfile;
        await ctx.replyWithHTML(
            `<b>${fullName}</b>\n` +
            `<b>Станция метро:</b> ${metroStation || '-'}\n` +
            `<b>Реквизиты:</b> ${paymentDetails || '-'}\n` +
            `<b>Телефон:</b> ${phone}\n` +
            `<b>Баланс:</b> ${ctx.session.balance}\n` +
            `<b>Рабочие дни:</b> ${workDays ? formatWorkDays(workDays) : '-'}\n` +
            `<b>Время работы:</b> ${startTime || '--'}:00 - ${endTime || '--'}:00\n` +
            `<b>Еженедельный доход:</b> ${weeklyIncome}\n` + 
            `<b>Бонусы:</b> ${bonus}\n` +
            `<b>Рейтинг:</b> ${rating}\n` +
            `${role==='driver'?
                '<b>Машина:</b>'+formatVehicleData(driverInfo):
                ''}` + 
            `${role==='rigger'?'<b>Cвои ремни:</b>' + (hasStraps?'✅':'❌'):''}` + 
            `${role==='dismantler'?'<b>Свой инструмент:</b>' + (hasTools?'✅':'❌'):''}` + 
            `${role==='loader'?'<b>Свой инструмент:</b>' + (hasFurnitureTools?'✅':'❌'):''}` + 
            `${role==='handyman'?'<b>Работа в области:</b>' + (workInRegion?'✅':'❌'):''}`
        );

        await ctx.reply('Что вы хотите сделать?', Markup.keyboard([
            ['Моя статистика', 'Изменить данные'],
            ['Назад']
        ]).resize());
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
