/**
 * Скрипт для проверки токена Telegram бота
 * Запуск: node check-token.js [TOKEN]
 */

require('dotenv').config();
const { Telegraf } = require('telegraf');
const fs = require('fs');

// Получаем токен из аргументов командной строки или из переменных окружения
const token = process.argv[2] || process.env.BOT_TOKEN;

if (!token) {
    console.error('❌ Токен не предоставлен!');
    console.log('Использование: node check-token.js [TOKEN]');
    console.log('Или создайте файл .env с переменной BOT_TOKEN=your_token_here');
    process.exit(1);
}

console.log('Проверка токена Telegram бота...');

// Создаем объект бота с указанным токеном
const bot = new Telegraf(token);

// Пытаемся получить информацию о боте
bot.telegram.getMe()
    .then(info => {
        console.log('\n✅ Токен действителен!');
        console.log('Информация о боте:');
        console.log(`  ID: ${info.id}`);
        console.log(`  Имя: ${info.first_name}`);
        console.log(`  Username: @${info.username}`);
        
        // Сохраняем токен в .env, если он был предоставлен как аргумент и работает
        if (process.argv[2] && (!process.env.BOT_TOKEN || process.env.BOT_TOKEN !== token)) {
            try {
                // Путь к файлу .env
                const envPath = './.env';
                
                // Содержимое для записи или добавления
                const envContent = `BOT_TOKEN=${token}\n`;
                
                // Если файл существует, обновляем его
                if (fs.existsSync(envPath)) {
                    const currentContent = fs.readFileSync(envPath, 'utf8');
                    
                    if (currentContent.includes('BOT_TOKEN=')) {
                        // Заменяем существующую строку с токеном
                        const newContent = currentContent.replace(
                            /BOT_TOKEN=.*/,
                            `BOT_TOKEN=${token}`
                        );
                        fs.writeFileSync(envPath, newContent);
                    } else {
                        // Добавляем токен в конец файла
                        fs.appendFileSync(envPath, envContent);
                    }
                } else {
                    // Создаем новый файл .env
                    fs.writeFileSync(envPath, envContent);
                }
                
                console.log('\n✅ Токен сохранен в файле .env');
            } catch (error) {
                console.error('\n❌ Ошибка при сохранении токена в .env:', error.message);
            }
        }
    })
    .catch(error => {
        console.error('\n❌ Ошибка при проверке токена:');
        console.error(`  ${error.message}`);
        
        if (error.message.includes('401')) {
            console.log('\nТокен недействителен или был отозван.');
            console.log('Получите новый токен у @BotFather в Telegram и повторите попытку.');
        } else if (error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
            console.log('\nПроблема с сетевым подключением.');
            console.log('Проверьте ваше интернет-соединение и повторите попытку.');
        }
    });
