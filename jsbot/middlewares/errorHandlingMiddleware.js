/**
 * Middleware для перехвата и обработки ошибок в обработчиках Telegraf
 */
module.exports = async (ctx, next) => {
    try {
        await next(); // Продолжаем к следующему обработчику
    } catch (error) {
        // Логируем ошибку
        console.error(`Ошибка в обработчике сообщения:`, error);
        
        // Добавляем контекст ошибки
        const user = ctx.from;
        console.log(`Пользователь: ${user ? user.id : 'неизвестно'}, Чат: ${ctx.chat ? ctx.chat.id : 'неизвестно'}`);
        
        // Информация о сцене (если используется)
        if (ctx.scene && ctx.scene.current) {
            console.log(`Текущая сцена: ${ctx.scene.current.id}, Шаг: ${ctx.session.step}`);
        }
        
        // Определяем тип ошибки и отправляем соответствующее сообщение пользователю
        if (error.message.includes('Cannot read') || error.message.includes('undefined')) {
            await ctx.reply('Извините, произошла ошибка при обработке данных. Мы уже работаем над ее исправлением.');
        } else if (error.code === 'ETIMEDOUT' || error.message.includes('network')) {
            await ctx.reply('Извините, возникли проблемы с соединением. Пожалуйста, повторите попытку позже.');
        } else if (error.description && error.description.includes("can't parse entities")) {
            const plainText = "Произошла ошибка форматирования сообщения. Попробуйте выполнить команду еще раз.";
            await ctx.reply(plainText);
        } else {
            // Общее сообщение об ошибке
            await ctx.reply('Извините, произошла ошибка. Пожалуйста, попробуйте позже или обратитесь к администратору.');
        }
        
        // Если боту не удалось отправить сообщение, просто логируем это
        try {
            // Попытка вернуть пользователя в главное меню при серьезных ошибках
            if (ctx.scene && error.message.includes('Cannot read properties')) {
                await ctx.scene.enter('mainScene');
            }
        } catch (replyError) {
            console.error('Не удалось отправить сообщение об ошибке или перевести в главное меню:', replyError.message);
        }
    }
};
