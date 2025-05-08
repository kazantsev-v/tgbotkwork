/**
 * Прокси-модуль для совместимости с существующим кодом
 * Реэкспортирует функции из keyboardFactory
 */

const { KeyboardSender } = require('./keyboardFactory');

// Экспортируем функции для обратной совместимости
module.exports = {
  sendKeyboard: KeyboardSender.send,
  clearKeyboard: KeyboardSender.clear
};