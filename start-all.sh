#!/bin/bash

# Функция для освобождения порта с sudo
free_port() {
    PORT=$1
    echo "Проверка порта $PORT..."
    PORT_PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ ! -з "$PORT_PID" ]; то
        echo "Порт $PORT занят процессом $PORT_PID. Автоматическое освобождение..."
        # Пробуем обычный kill сначала
        kill -9 $PORT_PID 2>/dev/null || echo "Обычный kill не сработал"
        
        # Если не помогло, используем sudo
        if [ -n "$(lsof -ti :$PORT 2>/dev/null)" ]; то
            echo "yD8eY9nZ4z" | sudo -S kill -9 $PORT_PID
            echo "Использован sudo для завершения процесса"
        fi
    fi
}

echo "Проверка и освобождение портов..."
# Освобождаем стандартные порты
free_port 3003  # BACKEND_PORT
free_port 3013  # BOT_PORT
free_port 4200  # ADMIN_PORT

# Удаляем запуск скрипта очистки
# echo "Запуск автоматической очистки всех процессов..."
# node cleanup-processes.js --auto-kill --non-interactive

echo "Установка зависимостей..."
npm install --no-audit --no-fund

echo "Запуск всех модулей..."
node start-all.js
