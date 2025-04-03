/**
 * Утилиты для работы с Telegram API
 */

/**
 * Экранирует HTML-символы для безопасного использования в сообщениях Telegram
 * @param {string} text - Исходный текст
 * @returns {string} - Экранированный текст
 */
function escapeHTML(text) {
    if (!text || typeof text !== 'string') return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * Форматирует данные списком для использования в HTML-сообщениях Telegram
 * (с учетом ограничений Telegram API)
 * @param {Array} items - Элементы списка
 * @param {string} bullet - Символ или строка для маркера списка
 * @returns {string} - Отформатированный список
 */
function formatList(items, bullet = '• ') {
    if (!items || !Array.isArray(items) || items.length === 0) return '';
    
    return '\n' + items.map(item => `${bullet}${escapeHTML(item)}`).join('\n');
}

/**
 * Форматирует ключ-значение для HTML-сообщений
 * @param {string} key - Ключ (будет жирным)
 * @param {string} value - Значение
 * @returns {string} - Отформатированная строка
 */
function formatKeyValue(key, value, defaultValue = '-') {
    if (!key) return '';
    
    const formattedValue = value !== undefined && value !== null ? 
        escapeHTML(String(value)) : defaultValue;
    
    return `<b>${escapeHTML(key)}:</b> ${formattedValue}\n`;
}

/**
 * Проверяет, поддерживает ли Telegram HTML-тег
 * @param {string} tag - HTML-тег без символов < >
 * @returns {boolean} - true если тег поддерживается
 */
function isSupportedTag(tag) {
    const supportedTags = ['b', 'i', 'u', 's', 'a', 'code', 'pre'];
    return supportedTags.includes(tag.toLowerCase());
}

/**
 * Безопасно отправляет сообщение с HTML-форматированием
 * @param {object} ctx - Контекст Telegraf
 * @param {string} html - HTML-текст
 * @param {object} extra - Дополнительные параметры
 * @returns {Promise} - Promise от метода отправки
 */
async function sendSafeHTML(ctx, html, extra = {}) {
    try {
        return await ctx.replyWithHTML(html, extra);
    } catch (error) {
        if (error.description && error.description.includes("can't parse entities")) {
            console.error('Ошибка HTML-разметки:', error.description);
            // Удаляем все HTML-теги и отправляем как обычный текст
            const plainText = html.replace(/<\/?[^>]+(>|$)/g, "");
            await ctx.reply('⚠️ Ошибка форматирования. Отправляю обычным текстом:\n\n' + plainText);
        } else {
            throw error;
        }
    }
}

module.exports = {
    escapeHTML,
    formatList,
    formatKeyValue,
    isSupportedTag,
    sendSafeHTML
};
