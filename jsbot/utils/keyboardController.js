const { Markup } = require("telegraf");

/**
 * Класс для управления клавиатурами в Telegram боте
 */
class KeyboardController {
  /**
   * Безопасно отправляет сообщение с новой клавиатурой
   * @param {Object} ctx - Контекст Telegraf
   * @param {string} text - Текст сообщения
   * @param {Object} keyboard - Объект клавиатуры от Markup
   * @param {Object} options - Дополнительные опции
   * @returns {Promise} - Промис с результатом отправки
   */
  static async sendKeyboard(ctx, text, keyboard, options = {}) {
    try {
      const { removeOld = true, parseMode = 'HTML', editMessage = false } = options;
      
      // Если нужно удалить старую клавиатуру
      if (removeOld) {
        await ctx.reply("", Markup.removeKeyboard());
      }
      
      // Параметры для отправки сообщения
      const msgOptions = {
        ...keyboard,
        parse_mode: parseMode,
        disable_web_page_preview: options.disableWebPreview || false
      };
      
      // Редактировать или отправить новое сообщение
      if (editMessage && ctx.callbackQuery && ctx.callbackQuery.message) {
        return await ctx.editMessageText(text, msgOptions);
      } else {
        return await ctx.reply(text, msgOptions);
      }
    } catch (error) {
      console.error("Ошибка при отправке клавиатуры:", error);
      // Пытаемся отправить сообщение даже если произошла ошибка
      return await ctx.reply(text, keyboard);
    }
  }

  /**
   * Удаляет клавиатуру из чата
   * @param {Object} ctx - Контекст Telegraf
   * @param {string} text - Текст сообщения
   * @returns {Promise} - Промис с результатом отправки
   */
  static async clearKeyboard(ctx, text = "Клавиатура очищена") {
    try {
      return await ctx.reply(text, Markup.removeKeyboard());
    } catch (error) {
      console.error("Ошибка при очистке клавиатуры:", error);
      return false;
    }
  }

  /**
   * Обновляет существующую клавиатуру
   * @param {Object} ctx - Контекст Telegraf
   * @param {string} text - Новый текст сообщения
   * @param {Object} keyboard - Новый объект клавиатуры
   * @returns {Promise} - Промис с результатом редактирования
   */
  static async updateKeyboard(ctx, text, keyboard) {
    try {
      if (ctx.callbackQuery && ctx.callbackQuery.message) {
        return await ctx.editMessageText(text, {
          ...keyboard,
          parse_mode: 'HTML',
          message_id: ctx.callbackQuery.message.message_id,
          chat_id: ctx.callbackQuery.message.chat.id
        });
      } else {
        return await this.sendKeyboard(ctx, text, keyboard);
      }
    } catch (error) {
      console.error("Ошибка при обновлении клавиатуры:", error);
      return false;
    }
  }

  /**
   * Отправляет временную клавиатуру, которая исчезнет через указанное время
   * @param {Object} ctx - Контекст Telegraf
   * @param {string} text - Текст сообщения
   * @param {Object} keyboard - Объект клавиатуры
   * @param {number} timeout - Время в миллисекундах, через которое клавиатура исчезнет
   * @returns {Promise} - Промис с результатом отправки
   */
  static async sendTemporaryKeyboard(ctx, text, keyboard, timeout = 60000) {
    try {
      const message = await this.sendKeyboard(ctx, text, keyboard);
      setTimeout(async () => {
        try {
          await ctx.telegram.editMessageReplyMarkup(
            message.chat.id,
            message.message_id,
            undefined,
            { inline_keyboard: [] }
          );
        } catch (err) {
          console.error("Ошибка при удалении временной клавиатуры:", err);
        }
      }, timeout);
      return message;
    } catch (error) {
      console.error("Ошибка при отправке временной клавиатуры:", error);
      return false;
    }
  }
}

// Для обратной совместимости экспортируем также отдельные функции
const sendKeyboard = KeyboardController.sendKeyboard.bind(KeyboardController);
const clearKeyboard = KeyboardController.clearKeyboard.bind(KeyboardController);
const updateKeyboard = KeyboardController.updateKeyboard.bind(KeyboardController);
const sendTemporaryKeyboard = KeyboardController.sendTemporaryKeyboard.bind(KeyboardController);

module.exports = {
  KeyboardController,
  sendKeyboard,
  clearKeyboard,
  updateKeyboard,
  sendTemporaryKeyboard
};