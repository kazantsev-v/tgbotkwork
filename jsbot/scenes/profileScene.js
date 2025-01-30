const { Scenes, Markup } = require('telegraf');
const  { daysOfWeek } = require('../utils/keyboards');
const { updateUserSceneStep, updateUserBalance } = require('../utils/user');
const { updateStep } = require('../utils/common');

function formatWorkDays(workDays) {
    return workDays.map(day => daysOfWeek.find(d => d.id === day).text).join(', ');
}

const profileScene = new Scenes.BaseScene('profileScene');

profileScene.enter(async (ctx) => {
    await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
    const role = ctx.session.role;
    const isCustomer = ctx.session.role === 'customer'; // Проверяем роль
    const userProfile = isCustomer ? ctx.session.customerInfo : ctx.session.workerInfo; // Получаем профиль из сессии

    if (userProfile.photo) {
        if (!userProfile.photo.startsWith("http")) {
            await ctx.replyWithPhoto(userProfile.photo);
        } else {
            await ctx.replyWithPhoto({ url: userProfile.photo});
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
                '<b>Машина:</b><ul>\n'+
                '<li>Длина:'+driverInfo.length||'-'+'</li>\n' +
                '<li>Ширина:'+driverInfo.width||'-'+'</li>\n' +
                '<li>Высота:'+driverInfo.height||'-'+'</li>\n' +
                '<li>Объем:'+driverInfo.volume||'-'+'</li>\n' +
                '<li>Грузоподъемность:'+driverInfo.capacity||'-'+'</li>\n' +
                '<li>Марка:'+driverInfo.brand||'-'+'</li>\n' +
                '<li>Кол-во мест:'+driverInfo.availableSpots||'-'+'</li>\n' +
                + '</ul>\n':
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
