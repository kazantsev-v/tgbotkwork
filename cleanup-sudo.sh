#!/bin/bash

# Определяем директорию скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "Запуск очистки с повышенными правами..."

# Используем сохраненный пароль для sudo
echo "Автоматическое завершение процессов с sudo..."
echo "yD8eY9nZ4z" | sudo -S pkill -f "start-all.js" || true
echo "yD8eY9nZ4z" | sudo -S pkill -f "jsbot/index.js" || true
echo "yD8eY9nZ4z" | sudo -S pkill -f "jsback/dist/server.js" || true
echo "yD8eY9nZ4z" | sudo -S pkill -f "ng serve" || true

# Запускаем скрипт очистки в автоматическом режиме
echo "Запуск скрипта очистки..."
node "$SCRIPT_DIR/cleanup-processes.js" --auto-kill

echo "Очистка завершена!"
