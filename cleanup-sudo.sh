#!/bin/bash

# Определяем директорию скрипта
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

echo "Запуск очистки с повышенными правами..."
echo "Для полной очистки могут потребоваться права администратора."

# Проверяем, есть ли sudo
if command -v sudo &> /dev/null; then
    # Завершаем все node процессы связанные с проектом
    echo "Завершение процессов с sudo..."
    sudo pkill -f "start-all.js" || true
    sudo pkill -f "jsbot/index.js" || true
    sudo pkill -f "jsback/dist/server.js" || true
    sudo pkill -f "ng serve" || true
    
    # Затем запускаем cleanup-processes.js
    echo "Запуск скрипта очистки..."
    node "$SCRIPT_DIR/cleanup-processes.js"
else
    echo "Команда sudo не найдена. Запускаем скрипт без повышенных прав."
    node "$SCRIPT_DIR/cleanup-processes.js"
    
    echo "Если очистка не удалась из-за недостатка прав, можно попробовать завершить процессы вручную:"
    echo "Для просмотра процессов: ps aux | grep node"
    echo "Для завершения: kill -9 <PID>"
fi

echo "Готово!"
