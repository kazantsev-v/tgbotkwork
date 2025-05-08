const { Markup } = require("telegraf");

/**
 * Фабрика для создания различных типов клавиатур
 */
class KeyboardFactory {
  /**
   * Создает обычную клавиатуру с кнопками
   * @param {Array} buttons - Массив кнопок или массив массивов кнопок
   * @param {Object} options - Настройки клавиатуры
   * @returns {Object} Объект клавиатуры Markup
   */
  static createReplyKeyboard(buttons, options = {}) {
    const defaultOptions = {
      resize: true,
      oneTime: false,
      selective: false,
      ...options
    };
    
    return Markup.keyboard(buttons).resize(defaultOptions.resize)
      .oneTime(defaultOptions.oneTime)
      .selective(defaultOptions.selective);
  }
  
  /**
   * Создает инлайн-клавиатуру
   * @param {Array} buttons - Массив кнопок инлайн-клавиатуры
   * @param {Object} options - Настройки клавиатуры
   * @returns {Object} Объект инлайн-клавиатуры Markup
   */
  static createInlineKeyboard(buttons, options = {}) {
    const { columns = 1 } = options;
    
    if (columns > 1 && Array.isArray(buttons) && !Array.isArray(buttons[0])) {
      // Преобразуем линейный массив в двумерный с указанным количеством колонок
      const result = [];
      for (let i = 0; i < buttons.length; i += columns) {
        result.push(buttons.slice(i, i + columns));
      }
      return Markup.inlineKeyboard(result);
    }
    
    return Markup.inlineKeyboard(buttons);
  }
  
  /**
   * Создает клавиатуру с URL-кнопками
   * @param {Array} items - Массив объектов {text, url}
   * @param {Number} columns - Количество колонок
   * @returns {Object} Объект инлайн-клавиатуры с URL-кнопками
   */
  static createUrlKeyboard(items, columns = 1) {
    const buttons = items.map(item => Markup.button.url(item.text, item.url));
    return this.createInlineKeyboard(buttons, { columns });
  }
  
  /**
   * Создает календарь для выбора даты
   * @param {Number} month - Месяц (0-11)
   * @param {Number} year - Год
   * @returns {Object} Объект инлайн-клавиатуры календаря
   */
  static createCalendarKeyboard(month = new Date().getMonth(), year = new Date().getFullYear()) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay() || 7; // 1-7 (пн-вс)
    
    // Заголовок с месяцем и годом
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                         'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    const headerRow = [Markup.button.callback(`${monthNames[month]} ${year}`, 'ignore')];
    
    // Дни недели
    const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(
      day => Markup.button.callback(day, 'ignore')
    );
    
    // Сетка календаря
    const grid = [];
    const weeksCount = Math.ceil((firstDay - 1 + daysInMonth) / 7);
    
    for (let week = 0; week < weeksCount; week++) {
      const weekRow = [];
      for (let weekday = 1; weekday <= 7; weekday++) {
        const day = week * 7 + weekday - (firstDay - 1);
        if (day > 0 && day <= daysInMonth) {
          weekRow.push(Markup.button.callback(`${day}`, `date_${day}_${month + 1}_${year}`));
        } else {
          weekRow.push(Markup.button.callback(' ', 'ignore'));
        }
      }
      grid.push(weekRow);
    }
    
    // Кнопки навигации
    const navRow = [
      Markup.button.callback('◀️', `prev_month_${month}_${year}`),
      Markup.button.callback('Сегодня', `today_${month}_${year}`),
      Markup.button.callback('▶️', `next_month_${month}_${year}`)
    ];
    
    // Собираем клавиатуру
    const keyboard = [headerRow, weekDays, ...grid, navRow];
    return Markup.inlineKeyboard(keyboard);
  }
}

/**
 * Класс для управления отправкой клавиатур
 */
class KeyboardSender {
  /**
   * Отправляет сообщение с клавиатурой
   * @param {Object} ctx - Контекст Telegraf
   * @param {String} text - Текст сообщения
   * @param {Object} keyboard - Объект клавиатуры
   * @param {Object} options - Дополнительные опции
   * @returns {Promise} Промис с результатом отправки
   */
  static async send(ctx, text, keyboard, options = {}) {
    try {
      const { 
        clearPrevious = true, 
        parseMode = 'HTML', 
        editExisting = false,
        disablePreview = true 
      } = options;
      
      if (clearPrevious) {
        await ctx.reply("", Markup.removeKeyboard());
      }
      
      const messageOptions = {
        ...keyboard,
        parse_mode: parseMode,
        disable_web_page_preview: disablePreview
      };
      
      if (editExisting && ctx.callbackQuery?.message) {
        return await ctx.editMessageText(text, messageOptions);
      }
      
      return await ctx.reply(text, messageOptions);
    } catch (error) {
      console.error('Ошибка при отправке клавиатуры:', error);
      return ctx.reply(text, keyboard);
    }
  }
  
  /**
   * Удаляет клавиатуру
   * @param {Object} ctx - Контекст Telegraf
   * @param {String} text - Текст сообщения при удалении
   * @returns {Promise} Промис с результатом отправки
   */
  static async clear(ctx, text = "Клавиатура убрана") {
    return await ctx.reply(text, Markup.removeKeyboard());
  }
}

module.exports = {
  KeyboardFactory,
  KeyboardSender,
  // Для обратной совместимости
  sendKeyboard: KeyboardSender.send,
  clearKeyboard: KeyboardSender.clear
};