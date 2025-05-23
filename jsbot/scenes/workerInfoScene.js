const { Scenes, Markup } = require('telegraf');
const { message } = require('telegraf/filters');
const { 
    generateTimeKeyboard, 
    generateWeekdayKeyboard, 
    generateWorkDaysKeyboard, 
    daysOfWeek 
} = require('../utils/keyboards');
const { 
    validateFullName, 
    validateCardNumber, 
    validatePhone,
    validateSBP
} = require('../utils/validators');
const { 
    getNearestMetroStation, 
    getStationCoordinates,
    saveDocument,
    updateStep
} = require('../utils/common');
const { 
    updateUserSceneStep
} = require('../utils/user');
const { metro_stations } = require('../models/common');


const workerInfoScene = new Scenes.BaseScene('workerInfoScene');

    workerInfoScene.enter(async (ctx) => {
        ctx.session.workerInfo = {};
        ctx.session.step = 'fullName';
        await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
        if(process.env.NODE_ENV === 'development')
            ctx.session.step = 'fullName';
        ctx.reply('Введите ваше ФИО:');
    });

    workerInfoScene.on(message('text'), async (ctx, next) => {
        console.log('in text handler');
        const text = ctx.message.text;
        switch (ctx.session.step) {
            case 'fullName':
                if(validateFullName(text)) {
                    ctx.session.workerInfo.fullName = text;
                    ctx.session.step = 'geolocation';
                    await ctx.reply('Предоставьте местоположение', 
                        Markup.keyboard([
                            Markup.button.locationRequest('🌍Поделится геолокацией'),
                            Markup.button.callback('📎Прикрепить геопозицию', 'g_location'),
                            Markup.button.callback('🚊Выбрать ближайшую станцию метро:', 'm_location'),
                            Markup.button.callback('✍🏻Ввести адрес вручную', 'direct_location'),
                        ])
                    );
                } else {
                    await ctx.reply('ФИО введено неверно. Введите, например: Иванов Иван Иванович');
                }
                break;
            case 'geolocation':
                if(text === '📎Прикрепить геопозицию') {
                    await ctx.reply('🌍Пожалуйста, отправьте геопозицию. 📎Прикрепить → 🌍Геопозиция', Markup.removeKeyboard());
                } else if(text === '🚊Выбрать ближайшую станцию метро:') {
                    await ctx.reply('Выберите ближайшую станцию метро:', 
                        Markup.inlineKeyboard(
                            metro_stations.map(station => [Markup.button.callback(station, `metro_${station}`)])
                        )
                    );
                } else if(text === '✍🏻Ввести адрес вручную') {
                    ctx.session.step = 'direct_address';
                    await ctx.reply('Введите адрес:', Markup.removeKeyboard());
                }
                break;
            case 'direct_address':
                ctx.session.workerInfo.address = text;
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
            case 'paymentMethod':
                if (text === 'СБП') {
                    await updateStep(
                        ctx, 
                        'sbpNumber',
                        'Введите номер телефона, привязанный к СБП:'
                    );
                    return; // Добавляем return для завершения обработки
                } else if (text === 'Номер Карты') {
                    await updateStep(
                        ctx, 
                        'cardNumber',
                        'Введите номер карты:'
                    );
                    return; // Добавляем return для завершения обработки
                } else {
                    await ctx.reply('Выберите СБП или Номер Карты используя кнопки');
                    return;
                }
                break; // Этот код не выполнится из-за return выше
            case 'sbpNumber':
                if (validateSBP(text)) {
                    ctx.session.workerInfo.paymentDetails = `СБП: ${text}`;
                    await updateStep(
                        ctx, 
                        'startTime',
                        'Укажите время начала работы:', 
                        await generateTimeKeyboard()
                    );
                } else {
                    await ctx.reply('Некорректный номер телефона для СБП. Введите в формате +7ХХХХХХХХХХ или 8ХХХХХХХХХХ');
                }
                break;
            case 'cardNumber':
                if (validateCardNumber(text)) {
                    ctx.session.workerInfo.paymentDetails = `Карта: ${text}`;
                    await updateStep(
                        ctx, 
                        'startTime',
                        'Укажите время начала работы:', 
                        await generateTimeKeyboard()
                    );
                } else {
                    await ctx.reply('Введите корректный номер карты (16 цифр).');
                }
                break;
            case 'photo':
                await ctx.reply('Пожалуйста, отправьте фото.');
                break;
            case 'workHours':
                ctx.session.workerInfo.workHours = text;
                ctx.session.step = 'phone';
                await ctx.reply('Предоставьте номер телефона', 
                    Markup.keyboard([
                        Markup.button.contactRequest('📲 Поделится номером телефона'),
                        Markup.button.callback('Ввести вручную', 'custom_phone_input')
                    ])
                );
                break;
            case 'phone':
                const phone = text;
                if (validatePhone(phone)) {
                    ctx.session.workerInfo.phone = phone;
                    console.log(ctx.session.workerInfo);
                    ctx.scene.enter('roleInfoScene');
                } else {
                    await ctx.reply('Введите корректный номер телефона.');
                }
                break;
        }
    });

    /*workerInfoScene.action(/m_location/, async (ctx, next) => {
        console.log('in m_location');
        await ctx.reply('🌍Пожалуйста, отправьте геопозицию. 📎Прикрепить → 🌍Геопозиция');
    });

    workerInfoScene.action(/g_location/, async (ctx, next) => {
        console.log('in g_location handler');
        ctx.session.step = 'geolocation';
        await ctx.reply('Выберите ближайшую станцию метро:', 
            Markup.inlineKeyboard(
                metro_stations.map(station => [Markup.button.callback(station, `metro_${station}`)])
            )
        );
    });*/
    
    workerInfoScene.action(/metro_(.+)/, async (ctx, next) => {
        console.log('in metro handler');
        ctx.session.workerInfo.metroStation = ctx.match[1];
        ctx.session.workerInfo.location = getStationCoordinates(ctx.session.workerInfo.metroStation);
        ctx.session.workerInfo.address = ctx.session.workerInfo.metroStation;
        
        // Исправляем: вместо перехода к paymentDetails сразу,
        // показываем выбор метода оплаты (paymentMethod)
        await updateStep(
            ctx, 
            'paymentMethod',
            'Выберите реквизит для оплаты:', 
            Markup.keyboard([
                Markup.button.callback('СБП', 'sbp'),
                Markup.button.callback('Номер Карты', 'card'),
            ])
        );
    });

    workerInfoScene.action(/time_(\d+)/, async (ctx) => {
        console.log('in time handler');
        const selectedTime = parseInt(ctx.match[1]);
        
        if (!ctx.session.workerInfo.startTime) {
            ctx.session.workerInfo.startTime = selectedTime;
            await ctx.reply('Выберите конец рабочего времени:', await generateTimeKeyboard());
        } else {
            ctx.session.workerInfo.endTime = selectedTime;
            await ctx.reply(`Ваш рабочий интервал: с ${ctx.session.workerInfo.startTime}:00 до ${ctx.session.workerInfo.endTime}:00.`);
            ctx.session.step = 'phone';
                await ctx.reply('Предоставьте номер телефона', 
                    Markup.keyboard([
                        Markup.button.contactRequest('📲 Поделится номером телефона'),
                        Markup.button.callback('Ввести вручную', 'custom_phone_input')
                    ])
                );
        }
    });

    workerInfoScene.action(/day_(\w+)/, async (ctx) => {
        const selectedDay = ctx.match[1];
        const workDays = ctx.session.workerInfo.workDays || [];
    
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

    workerInfoScene.action('confirm_days', async (ctx) => {
        if (ctx.session.workerInfo.workDays && ctx.session.workerInfo.workDays.length > 0) {
            await ctx.reply(`Вы выбрали рабочие дни: ${ctx.session.workerInfo.workDays.map(day => {
                return daysOfWeek.find(d => d.id === day).text
            }).join(', ')}`);
            ctx.session.step = 'workHours';
            await ctx.reply('Выберите начало рабочего времени:', await generateTimeKeyboard());
        } else {
            await ctx.reply('Вы не выбрали рабочие дни!');
        }
    });
    
    workerInfoScene.on(message('photo'), async (ctx, next) => {
        console.log('in photo handler');
        const photo = ctx.message.photo;
        if (!photo || photo.length === 0) {
            return await ctx.reply('Не удалось получить фото. Пожалуйста, попробуйте снова.');
        }
        
        // Получение фото с наибольшим разрешением
        const highResolutionPhoto = photo[photo.length - 1];
        ctx.session.workerInfo.photo = highResolutionPhoto.file_id;
        const fileLink = await ctx.telegram.getFileLink(highResolutionPhoto.file_id);
        const doclink = await saveDocument(fileLink, highResolutionPhoto.file_id);
        ctx.session.workerInfo.photoLink = doclink
        ctx.session.step = 'workDays';
        if(!ctx.session.workerInfo.workDays)
            ctx.session.workerInfo.workDays = [];
        await ctx.reply('Выберите рабочие дни', await generateWorkDaysKeyboard(ctx.session.workerInfo.workDays));
    });

    workerInfoScene.on(message('contact'), async (ctx) => {
        console.log('in phone handler');
        console.log(ctx.message.contact.phone_number);
        ctx.session.workerInfo.phone = ctx.message.contact.phone_number;
        console.log(ctx.session.workerInfo);
        ctx.scene.enter('roleInfoScene');
    });

    workerInfoScene.on(message('location'), async (ctx, next) => {
        console.log('in location handler');
        ctx.session.workerInfo.location = {
            latitude: ctx.message.location.latitude, 
            longitude: ctx.message.location.longitude
        };

        ctx.session.workerInfo.metroStation = getNearestMetroStation(ctx.message.location).name;
        ctx.session.workerInfo.address = ctx.session.workerInfo.metroStation;
        
        await ctx.reply(`Ближайшая станция метро: ${ctx.session.workerInfo.metroStation}`);
        
        // Исправляем: показываем выбор метода оплаты (paymentMethod) вместо запроса реквизитов
        await updateStep(
            ctx, 
            'paymentMethod',
            'Выберите реквизит для оплаты:', 
            Markup.keyboard([
                Markup.button.callback('СБП', 'sbp'),
                Markup.button.callback('Номер Карты', 'card'),
            ])
        );
    });
    
    module.exports = workerInfoScene;