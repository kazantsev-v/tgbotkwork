const { Scenes, Markup } = require('telegraf');
const { 
    updateUserSceneStep
} = require('../utils/user');
const { 
    updateStep
} = require('../utils/common');
const { 
    getTaskById, 
    getTasksByCreatorId, 
    getPhotosByTaskId 
} = require('../utils/task');

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
    try {
        const tasks = await getTasksByCreatorId(ctx.session.userId);
        // Добавляем проверку на случай, если tasks === undefined или null
        if(!tasks || !tasks.length) return [];

        // Используем Promise.all для корректной загрузки всех фотографий
        const tasksWithPhotos = await Promise.all(tasks.map(async task => {
            try {
                const photos = await getPhotosByTaskId(task.id);
                return {...task, photos};
            } catch (error) {
                console.error(`Ошибка при загрузке фото для задания ${task.id}:`, error.message);
                return {...task, photos: []};
            }
        }));
        
        return tasksWithPhotos;
    } catch (error) {
        console.error("Ошибка при загрузке заданий:", error.message);
        return [];
    }
}

async function showTasks(ctx, tasks) {
    const buttons = tasks.map((task) =>
        Markup.button.callback(task.title, `view_task_${task.id}`)
    );

    await ctx.reply('Список заданий:', Markup.inlineKeyboard(buttons, { columns: 1 }));
}

const customerTasksScene = new Scenes.BaseScene('customerTasksScene');

// Вход в сцену
customerTasksScene.enter(async (ctx) => {
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
});

customerTasksScene.hears('Назад', async (ctx) => {
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

customerTasksScene.action(/^view_task_\d+$/, async (ctx) => {
    try {
        ctx.session.step = 'viewTask';
        await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
        
        // Получаем ID задания из callback data
        const taskId = parseInt(ctx.match[0].split('_')[2]);
        
        // Сначала пытаемся найти задание в списке загруженных заданий
        const tasks = await loadTasks(ctx);
        let task = tasks.find(t => t.id === taskId);
        
        // Если задание не найдено в списке, пытаемся загрузить его напрямую
        if (!task) {
            console.log(`Задание ${taskId} не найдено в списке, загружаем напрямую`);
            try {
                task = await getTaskById(taskId);
                
                // Загружаем фотографии для задания
                if (task) {
                    task.photos = await getPhotosByTaskId(taskId);
                }
            } catch (directError) {
                console.error(`Ошибка при прямой загрузке задания ${taskId}:`, directError.message);
            }
        }

        // Если все равно не найдено, сообщаем пользователю
        if (!task) {
            await ctx.answerCbQuery('Задание не найдено');
            return ctx.reply('Задание не найдено. Возможно, оно было удалено или еще не обработано системой.');
        }

        // Отвечаем пользователю сначала callback запрос, чтобы не выдавать ошибку
        await ctx.answerCbQuery();
        
        // Формируем HTML-описание задания
        await ctx.replyWithHTML(
            `<b>Подробная информация о задании:</b>\n\n` +
            `<b>Название:</b> ${task.title}\n` +
            `<b>Описание:</b> ${task.description}\n` +
            `<b>Оплата:</b> ${task.payment}\n` +
            `<b>Упаковка нашим материалом:</b> ${task.pack_needed ? `Да (${task.pack_description || 'без описания'})` : 'Нет'}\n` +
            `<b>Дополнительный инструмент:</b> ${task.tool_needed ? `Да (${task.tool_description || 'без описания'})` : 'Нет'}\n` +
            `<b>Сборка/Разборка:</b> ${task.assemble_needed ? `Да (${task.assemble_description || 'без описания'})` : 'Нет'}\n` +
            `<b>Дата создания:</b> ${formatDate(task.created_at)}\n` +
            `<b>Описание для модератора:</b> ${task.moderator_description || 'Не указано'}\n` +
            `<b>Местоположение:</b> ${task.location}\n` +
            `<b>Даты исполнения:</b> ${Array.isArray(task.dates) ? task.dates.join(', ') : task.dates}\n` +
            `<b>Время начала:</b> ${task.start_time || 'Не указано'}\n` +
            `<b>Количество рабочих часов:</b> ${task.duration || 'Не указано'} ч\n` +
            `<b>Исполнитель:</b> ${task.executor?.name || 'не назначен'}\n` +
            `<b>Статус:</b> ${task.status || 'новое'}\n`
        );

        // Отправляем фотографии, если есть
        if (task.photos && task.photos.length) {
            for (const photo of task.photos) {
                try {
                    // Проверяем, что photo это объект или строка
                    if (typeof photo === 'string') {
                        // Если это строка, проверяем начинается ли она с http
                        if (photo.startsWith("http")) {
                            await ctx.replyWithPhoto({ url: photo });
                        } else {
                            await ctx.replyWithPhoto(photo);
                        }
                    } else if (photo && photo.url) {
                        // Если это объект с URL
                        await ctx.replyWithPhoto({ url: photo.url });
                    } else if (photo && photo.file_id) {
                        // Если это объект с file_id
                        await ctx.replyWithPhoto(photo.file_id);
                    } else {
                        console.log('Неизвестный формат фото:', photo);
                    }
                } catch (photoError) {
                    console.error(`Ошибка при отправке фото для задания ${taskId}:`, photoError.message);
                }
            }
        }
        
        // Добавляем кнопки управления заданием
        await ctx.reply(
            'Действия с заданием:',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Обновить', `refresh_task_${taskId}`)],
                [Markup.button.callback('⬅️ К списку заданий', 'back_to_tasks')]
            ])
        );
    } catch (error) {
        console.error('Ошибка при просмотре задания:', error.message);
        await ctx.answerCbQuery('Произошла ошибка');
        await ctx.reply('Извините, произошла ошибка при обработке вашего запроса. Пожалуйста, попробуйте позже.');
    }
});

// Обработчик кнопки "Обновить"
customerTasksScene.action(/^refresh_task_\d+$/, async (ctx) => {
    try {
        await ctx.answerCbQuery('Обновляем...');
        const taskId = parseInt(ctx.match[0].split('_')[2]);

        // Загружаем задание напрямую, чтобы получить актуальные данные
        const task = await getTaskById(taskId);
        
        if (!task) {
            return ctx.reply('Задание не найдено. Возможно, оно было удалено.');
        }
        
        // Загружаем фотографии для задания
        task.photos = await getPhotosByTaskId(taskId);
        
        // Формируем HTML-описание задания
        await ctx.replyWithHTML(
            `<b>Обновлённая информация о задании:</b>\n\n` +
            `<b>Название:</b> ${task.title}\n` +
            `<b>Описание:</b> ${task.description}\n` +
            `<b>Оплата:</b> ${task.payment}\n` +
            `<b>Упаковка нашим материалом:</b> ${task.pack_needed ? `Да (${task.pack_description || 'без описания'})` : 'Нет'}\n` +
            `<b>Дополнительный инструмент:</b> ${task.tool_needed ? `Да (${task.tool_description || 'без описания'})` : 'Нет'}\n` +
            `<b>Сборка/Разборка:</b> ${task.assemble_needed ? `Да (${task.assemble_description || 'без описания'})` : 'Нет'}\n` +
            `<b>Дата создания:</b> ${formatDate(task.created_at)}\n` +
            `<b>Описание для модератора:</b> ${task.moderator_description || 'Не указано'}\n` +
            `<b>Местоположение:</b> ${task.location}\n` +
            `<b>Даты исполнения:</b> ${Array.isArray(task.dates) ? task.dates.join(', ') : task.dates}\n` +
            `<b>Время начала:</b> ${task.start_time || 'Не указано'}\n` +
            `<b>Количество рабочих часов:</b> ${task.duration || 'Не указано'} ч\n` +
            `<b>Исполнитель:</b> ${task.executor?.name || 'не назначен'}\n` +
            `<b>Статус:</b> ${task.status || 'новое'}\n`
        );

        // Отправляем фотографии, если есть
        if (task.photos && task.photos.length) {
            for (const photo of task.photos) {
                try {
                    // Проверяем, что photo это объект или строка
                    if (typeof photo === 'string') {
                        // Если это строка, проверяем начинается ли она с http
                        if (photo.startsWith("http")) {
                            await ctx.replyWithPhoto({ url: photo });
                        } else {
                            await ctx.replyWithPhoto(photo);
                        }
                    } else if (photo && photo.url) {
                        // Если это объект с URL
                        await ctx.replyWithPhoto({ url: photo.url });
                    } else if (photo && photo.file_id) {
                        // Если это объект с file_id
                        await ctx.replyWithPhoto(photo.file_id);
                    } else {
                        console.log('Неизвестный формат фото:', photo);
                    }
                } catch (photoError) {
                    console.error(`Ошибка при отправке фото для задания ${taskId}:`, photoError.message);
                }
            }
        }
        
        // Добавляем кнопки управления заданием
        await ctx.reply(
            'Действия с заданием:',
            Markup.inlineKeyboard([
                [Markup.button.callback('🔄 Обновить', `refresh_task_${taskId}`)],
                [Markup.button.callback('⬅️ К списку заданий', 'back_to_tasks')]
            ])
        );
    } catch (error) {
        console.error('Ошибка при обновлении задания:', error.message);
        await ctx.reply('Извините, произошла ошибка при обновлении задания. Пожалуйста, попробуйте позже.');
    }
});

// Обработчик кнопки "К списку заданий"
customerTasksScene.action('back_to_tasks', async (ctx) => {
    try {
        await ctx.answerCbQuery();
        ctx.session.step = 'showTasks';
        await updateUserSceneStep(ctx.from.id, ctx.scene.current.id, ctx.session.step);
        
        // Загружаем задания заново
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
        console.error('Ошибка при возврате к списку заданий:', error.message);
        await ctx.reply('Извините, произошла ошибка. Возвращаемся в главное меню...');
        await ctx.scene.enter('mainScene');
    }
});

module.exports = customerTasksScene;
