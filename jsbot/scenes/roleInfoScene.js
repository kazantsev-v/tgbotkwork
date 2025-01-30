const { Scenes, Markup } = require('telegraf');
const { 
    validateNumericValue, 
    validateIntegerValue, 
    validateText 
} = require('../utils/validators');
const { message } = require('telegraf/filters');
const { Customer, Worker } = require('../models/user');
const { 
    saveDocument,
    updateStep,
    convertTimeToDbFormat
} = require('../utils/common')
const { 
    updateUserSceneStep, 
    saveCustomerUser, 
    saveWorkerUser
} = require('../utils/user')

const roleInfoScene = new Scenes.BaseScene('roleInfoScene');

roleInfoScene.enter(async (ctx) => {
    console.log(ctx.session.workerInfo, ctx.session.customerInfo, ctx.session.role)
    switch (ctx.session.role) {
        case 'driver':
            await updateStep(
                ctx,
                'vehicleLength',
                'Укажите длину автомобиля (в метрах):', 
                Markup.removeKeyboard()
            )
            break;
        case 'rigger':
            await updateStep(
                ctx,
                'hasStraps',
                'Есть свои ремни для работы?', 
                Markup.inlineKeyboard([
                    Markup.button.callback('Да', 'yes_straps'),
                    Markup.button.callback('Нет', 'no_straps')
                ])
            )
            break;
        case 'dismantler':
            await updateStep(
                ctx,
                'hasTools',
                'Есть свой инструмент для работы?', 
                Markup.inlineKeyboard([
                    Markup.button.callback('Да', 'yes_tools'),
                    Markup.button.callback('Нет', 'no_tools')
                ])
            );
            break;
        case 'loader':
            await updateStep(
                ctx,
                'hasFurnitureTools',
                'Есть свой инструмент для сборки/разборки мебели?', 
                Markup.inlineKeyboard([
                    Markup.button.callback('Да', 'yes_furnitureTools'),
                    Markup.button.callback('Нет', 'no_furnitureTools')
                ])
            );
            break;
        case 'handyman':
            await updateStep(
                ctx,
                'workInRegion',
                'Вы готовы выезжать на работу в область?', 
                Markup.inlineKeyboard([
                    Markup.button.callback('Да', 'yes_region'),
                    Markup.button.callback('Нет', 'no_region')
                ])
            );
            break;
        case 'customer':
            await updateStep(
                ctx,
                'paymentTerms',
                'Выберите вариант взаиморасчета:', 
                Markup.inlineKeyboard([
                    Markup.button.callback('С НДС', 'with_vat'),
                    Markup.button.callback('Без НДС', 'without_vat')
                ])
            )
            break;
        default:
            await ctx.reply('Неизвестная роль.');
            await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
            ctx.scene.enter('welcomeScene');
    }
});

roleInfoScene.on(message('text'), async (ctx) => {
    const text = ctx.message.text.trim();
    switch (ctx.session.step) {
        case 'vehicleLength':
            if (validateNumericValue(text)) {
                if(!ctx.session.workerInfo.driverInfo)
                    ctx.session.workerInfo.driverInfo = {}
                ctx.session.workerInfo.driverInfo.length = parseFloat(text);
                await updateStep(
                    ctx,
                    'vehicleWidth',
                    'Укажите ширину автомобиля (в метрах):'
                );
            } else {
                await ctx.reply('Введите корректное значение длины (например, 4.5):');
            }
            break;
        case 'vehicleWidth':
            if (validateNumericValue(text)) {
                ctx.session.workerInfo.driverInfo.width = parseFloat(text);
                await updateStep(
                    ctx,
                    'vehicleHeight',
                    'Укажите высоту автомобиля (в метрах):'
                );
            } else {
                await ctx.reply('Введите корректное значение ширины (например, 2.0):');
            }
            break;
        case 'vehicleHeight':
            if (validateNumericValue(text)) {
                ctx.session.workerInfo.driverInfo.height = parseFloat(text);
                await updateStep(
                    ctx,
                    'vehicleVolume',
                    'Укажите объем автомобиля (в кубометрах):'
                );
            } else {
                await ctx.reply('Введите корректное значение высоты (например, 2.5):');
            }
            break;
        case 'vehicleVolume':
            if (validateNumericValue(text)) {
                ctx.session.workerInfo.driverInfo.volume = parseFloat(text);
                await updateStep(
                    ctx,
                    'vehicleCapacity',
                    'Укажите грузоподъемность автомобиля (в тоннах):'
                );
            } else {
                await ctx.reply('Введите корректное значение объема (например, 10):');
            }
            break;
        case 'vehicleCapacity':
            if (validateNumericValue(text)) {
                ctx.session.workerInfo.driverInfo.capacity = parseFloat(text);
                await updateStep(
                    ctx,
                    'vehicleBrand',
                    'Укажите марку автомобиля:'
                );
            } else {
                await ctx.reply('Введите корректное значение грузоподъемности (например, 1.5):');
            }
            break;
        case 'vehicleBrand':
            if (validateText(text)) {
                ctx.session.workerInfo.driverInfo.brand = text;
                await updateStep(
                    ctx,
                    'availableSpots',
                    'Укажите количество свободных мест для грузчиков:'
                );
            } else {
                await ctx.reply('Введите корректное название марки автомобиля.');
            }
            break;
        case 'availableSpots':
            if (validateIntegerValue(parseInt(text, 10))) {
                ctx.session.workerInfo.driverInfo.availableSpots = parseInt(text, 10);
                await ctx.reply('Спасибо! Информация собрана.');
                try {
                    console.log(ctx.session.workerInfo);
                    const user = new Worker(
                        null, 
                        ctx.session.telegramId, 
                        ctx.session.role, 
                        ctx.session.workerInfo.fullName, 
                        ctx.session.workerInfo.photoLink, 
                        ctx.session.workerInfo.phone, 
                        ctx.scene.current.id,
                        ctx.session.step,
                        ctx.session?.balance,
                        ctx.session.workerInfo.metroStation, 
                        ctx.session.workerInfo.location, 
                        ctx.session.workerInfo.address, 
                        convertTimeToDbFormat(ctx.session.workerInfo.startTime),
                        convertTimeToDbFormat(ctx.session.workerInfo.endTime), 
                        ctx.session.workerInfo.paymentDetails,
                        5.0,
                        0,
                        ctx.session.workerInfo.driverInfo ?? null,
                        ctx.session.workerInfo.hasStraps || false,
                        ctx.session.workerInfo.hasTools || false,
                        ctx.session.workerInfo.hasFurnitureTools || false,
                        ctx.session.workerInfo.workInRegion || false,
                        0
                    )
                    await saveWorkerUser(user);
                    console.log('Пользователь сохранен на сервере');
                    await ctx.reply(`Пользователь сохранен: ${user.name}`);
                } catch (error) {
                    console.error(error);
                    await ctx.reply('Ошибка при сохранении пользователя.');
                }
                ctx.scene.enter('mainScene');
            } else {
                await ctx.reply('Введите корректное количество свободных мест (целое число).');
            }
            break;
        case 'companyDetails': 
            ctx.session.customerInfo.companyDetailsDoc = text;
            await ctx.reply('Реквизиты приняты. Спасибо! Информация собрана.');
            try {
                const user = new Customer(
                    null, 
                    ctx.session.telegramId, 
                    ctx.session.role, 
                    ctx.session.customerInfo.fullName, 
                    ctx.session.customerInfo.photoLink, 
                    ctx.session.customerInfo.phone,
                    ctx.scene.current.id,
                    ctx.session.step,
                    ctx.session?.balance,
                    ctx.session.customerInfo.companyName, 
                    ctx.session.customerInfo.additionalContacts,
                    ctx.session.customerInfo.paymentTerms, 
                    ctx.session.customerInfo.companyDetailsDoc
                )
                await saveCustomerUser(user);
                console.log('Пользователь сохранен на сервере');
                await ctx.reply(`Пользователь сохранен: ${user.name}`);
            } catch (error) {
                console.error(error);
                await ctx.reply('Ошибка при сохранении пользователя.');
            }
            ctx.scene.enter('mainScene');
            break;
        default:
            await ctx.reply('Некорректный ввод. Пожалуйста, попробуйте еще раз.');
            break;
    }
});

// Обработка инлайн-кнопок
roleInfoScene.action(/yes_straps|no_straps|yes_tools|no_tools|yes_furnitureTools|no_furnitureTools|yes_region|no_region|with_vat|without_vat/, async (ctx) => {
    const action = ctx.match[0];

    switch (action) {
        case 'yes_straps':
        case 'no_straps':
            ctx.session.workerInfo.hasStraps = action === 'yes_straps' ;
            break;
        case 'yes_tools':
        case 'no_tools':
            ctx.session.workerInfo.dismantlerInfo = action === 'yes_tools' ;
            break;
        case 'yes_furnitureTools':
        case 'no_furnitureTools':
            ctx.session.workerInfo.loaderInfo = action === 'yes_furnitureTools';
            break;
        case 'yes_region':
        case 'no_region':
            ctx.session.workerInfo.handymanInfo = action === 'yes_region';
            break;
        case 'with_vat':
        case 'without_vat':
            ctx.session.customerInfo.paymentTerms = (action === 'with_vat') ? 'с НДС' : 'без НДС';
            await updateStep(
                ctx,
                'companyDetails',
                'Добавьте платежные реквизиты компании (текстом или документом).'
            );
            return;
    }
    
    await ctx.reply('Спасибо! Информация собрана.');

    try {
        console.log(ctx.session.workerInfo);
        const user = new Worker(
            null, 
            ctx.session.telegramId, 
            ctx.session.role, 
            ctx.session.workerInfo.fullName, 
            ctx.session.workerInfo.photoLink, 
            ctx.session.workerInfo.phone,
            ctx.scene.current.id,
            ctx.session.step,
            ctx.session?.balance,
            ctx.session.workerInfo.metroStation, 
            ctx.session.workerInfo.location,
            ctx.session.workerInfo.address, 
            convertTimeToDbFormat(ctx.session.workerInfo.startTime),
            convertTimeToDbFormat(ctx.session.workerInfo.endTime), 
            ctx.session.workerInfo.paymentDetails,
            5.0,
            0,
            ctx.session.workerInfo.driverInfo ?? null,
            ctx.session.workerInfo.hasStraps || false,
            ctx.session.workerInfo.hasTools || false,
            ctx.session.workerInfo.hasFurnitureTools || false,
            ctx.session.workerInfo.workInRegion || false,
            0
        )
        await saveWorkerUser(user);
        console.log('Пользователь сохранен на сервере');
        await ctx.reply(`Пользователь сохранен: ${user.name}`);
    } catch (error) {
        console.error(error);
        await ctx.reply('Ошибка при сохранении пользователя.');
    }
    ctx.scene.enter('mainScene');
});

roleInfoScene.on(message('document'), async (ctx) => {
    if (ctx.session.step === 'companyDetails') {
        ctx.session.customerInfo.companyDetailsDoc = ctx.message.document.file_id;
        await ctx.reply('Документ с реквизитами принят. Спасибо! Информация собрана.');
        try {
            const fileLink = await ctx.telegram.getFileLink(ctx.session.customerInfo.companyDetailsDoc);
            const doclink = await saveDocument(fileLink, ctx.session.customerInfo.companyDetailsDoc);
            console.log('Документ сохранен на сервере')
            ctx.session.customerInfo.companyDetailsDoc = doclink;
            const user = new Customer(
                null, 
                ctx.session.telegramId, 
                ctx.session.role, 
                ctx.session.customerInfo.fullName, 
                ctx.session.customerInfo.photoLink, 
                ctx.session.customerInfo.phone,
                ctx.scene.current.id,
                ctx.session.step,
                ctx.session?.balance,
                ctx.session.customerInfo.companyName, 
                ctx.session.customerInfo.additionalContacts,
                ctx.session.customerInfo.paymentTerms, 
                doclink
            )
            await saveCustomerUser(user);
            console.log('Пользователь сохранен на сервере');
            await ctx.reply(`Пользователь сохранен: ${user.name}`);
        } catch (error) {
            console.error(error);
            await ctx.reply('Ошибка при сохранении пользователя.');
        }
        ctx.scene.enter('mainScene');
    }
});

module.exports = roleInfoScene;
