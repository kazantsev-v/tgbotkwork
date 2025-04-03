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

# Принудительное освобождение стандартных портов
for PORT in 3003 3013 4200; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ ! -z "$PID" ]; then
        echo "Порт $PORT занят процессом $PID. Освобождение..."
        echo "yD8eY9nZ4z" | sudo -S kill -9 $PID 2>/dev/null || true
    fi
done

# Запускаем скрипт очистки в автоматическом режиме (с флагом для неинтерактивного режима)
echo "Запуск скрипта очистки..."
# Добавляем таймаут для автоматического завершения, если скрипт зависнет
timeout 2m node "$SCRIPT_DIR/cleanup-processes.js" --auto-kill --non-interactive || echo "Скрипт очистки завершен по таймауту"

echo "Очистка завершена!"
