#!/bin/bash

echo "Запуск Admin Panel..."

# Проверяем, не занят ли порт 4200
PORT_CHECK=$(lsof -i :4200 | grep LISTEN)
if [ ! -z "$PORT_CHECK" ]; then
    echo "Порт 4200 занят. Пытаемся освободить..."
    PID=$(echo "$PORT_CHECK" | awk '{print $2}')
    kill -9 $PID
    sleep 1
fi

cd admin-panel
echo "Запуск с командой: ng serve --host 0.0.0.0 --ssl true --ssl-cert ./cert.pem --ssl-key ./privkey.pem"
ng serve --host 0.0.0.0 --ssl true --ssl-cert ./cert.pem --ssl-key ./privkey.pem
