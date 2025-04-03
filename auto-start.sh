#!/bin/bash

echo "Автоматический запуск всех служб с освобождением портов..."

# Автоматическое освобождение портов с sudo
echo "yD8eY9nZ4z" | sudo -S pkill -f "start-all.js" || true
echo "yD8eY9nZ4z" | sudo -S pkill -f "jsbot/index.js" || true 
echo "yD8eY9nZ4z" | sudo -S pkill -f "jsback/dist/server.js" || true
echo "yD8eY9nZ4z" | sudo -S pkill -f "ng serve" || true

# Принудительное освобождение стандартных портов
for PORT in 3003 3013 4200; do
    PID=$(lsof -ti :$PORT)
    if [ ! -z "$PID" ]; then
        echo "Порт $PORT занят процессом $PID. Освобождение..."
        echo "yD8eY9nZ4z" | sudo -S kill -9 $PID || true
    fi
done

echo "Запуск приложения..."
node start-all.js
