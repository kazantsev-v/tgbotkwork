#!/bin/bash

echo "Очистка предыдущих процессов..."
node cleanup-processes.js

echo "Установка зависимостей..."
npm install --no-audit --no-fund

echo "Запуск всех модулей..."
node start-all.js
