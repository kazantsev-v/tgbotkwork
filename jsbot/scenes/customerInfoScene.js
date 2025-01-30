const { Scenes, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const { 
    validateFullName, 
    validateCardNumber, 
    validateCompanyName, 
    validatePhone 
} = require('../utils/validators');
const { keyboard } = require('telegraf/markup');
const { 
    saveDocument,
    updateStep
} = require('../utils/common');
const { 
    updateUserSceneStep
} = require('../utils/user');

const customerInfoScene = new Scenes.BaseScene('customerInfoScene');

customerInfoScene.enter(async (ctx) => {
    ctx.session.customerInfo = {};
    await updateStep(ctx, 'fullName', 'Введите ваше ФИО:');
});

customerInfoScene.on(message('text'), async (ctx) => {
    const input = ctx.message.text;
    switch (ctx.session.step) {
        case 'fullName':
            if (validateFullName(input)) {
                ctx.session.customerInfo.fullName = input;
                await updateStep(ctx, 'companyName', 'Введите название компании:');
            } else {
                await ctx.reply('ФИО введено неверно. Введите, например: Иванов Иван Иванович.');
            }
            break;

        case 'companyName':
            if (validateCompanyName(input)) {
                ctx.session.customerInfo.companyName = input;
                await updateStep(
                    ctx, 
                    'phone', 
                    'Предоставьте номер телефона:', 
                    Markup.keyboard([
                        Markup.button.contactRequest('📲 Поделится номером телефона'),
                        Markup.button.callback('Ввести вручную', 'custom_phone_input')
                    ]).resize()
                )
            } else {
                await ctx.reply('Название компании введено неверно. Введите только буквы, цифры и пробелы.');
            }
            break;

        case 'phone':
            if (validatePhone(input)) {
                ctx.session.customerInfo.phone = input;
                await updateStep(ctx, 'photo', 'Пожалуйста, отправьте фото:', Markup.removeKeyboard());
            } else {
                await ctx.reply('Введите корректный номер телефона.');
            }
            break;

        case 'additionalContacts':
            ctx.session.customerInfo.additionalContacts = input;
            console.log(ctx.session.customerInfo);
            ctx.scene.enter('roleInfoScene');
            break;
    }
});

customerInfoScene.on(message('contact'), async (ctx) => {
    ctx.session.customerInfo.phone = ctx.message.contact.phone_number;
    await updateStep(ctx, 'photo', 'Пожалуйста, отправьте фото:', Markup.removeKeyboard());
});

customerInfoScene.on(message('photo'), async (ctx) => {
    const photo = ctx.message.photo;
    if (!photo || photo.length === 0) {
        return await ctx.reply('Не удалось получить фото. Пожалуйста, попробуйте снова.');
    }
    
    // Получение фото с наибольшим разрешением
    const highResolutionPhoto = photo[photo.length - 1];
    ctx.session.customerInfo.photo = highResolutionPhoto.file_id;
    const fileLink = await ctx.telegram.getFileLink(highResolutionPhoto.file_id);
    const doclink = await saveDocument(fileLink, highResolutionPhoto.file_id);
    console.log(doclink);
    ctx.session.customerInfo.photoLink = doclink
    await updateStep(ctx, 'additionalContacts', 'Введите дополнительные контактные данные (например, e-mail):');
});

customerInfoScene.action('custom_phone_input', async (ctx) => {
    await updateStep(ctx, 'phone', 'Введите номер телефона:');
});

module.exports = customerInfoScene;
