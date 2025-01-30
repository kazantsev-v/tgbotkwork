const { Markup } = require('telegraf');

/**
 * Функция для генерации inline-клавиатуры выбора времени
 * @returns {Markup.InlineKeyboardMarkup}
 */
function generateTimeKeyboard() {
    const times = [];
    for (let i = 0; i <= 23; i++) {
        times.push(Markup.button.callback(`${i}:00`, `time_${i}`));
    }
    return Markup.inlineKeyboard(times, { columns: 6 });
}

/**
 * Функция для генерации inline-клавиатуры выбора даты
 * @returns {Markup.InlineKeyboardMarkup}
 */
function generateWeekdayKeyboard() {
    const dates = [];
    for (let i = 1; i <= 31; i++) {
        dates.push(Markup.button.callback(`${i}`, `date_${i}`));
    }
    return Markup.inlineKeyboard(dates, { columns: 7 });
}

// Клавиатура для выбора рабочих дней
const daysOfWeek = [
    {text:'Понедельник', id:'monday'}, 
    {text:'Вторник', id:'tuesday'}, 
    {text:'Среда', id:'wednesday'}, 
    {text:'Четверг', id:'thursday'}, 
    {text:'Пятница', id:'friday'}, 
    {text:'Суббота', id:'saturday'}, 
    {text:'Воскресенье', id:'sunday'}
];

function generateWorkDaysKeyboard(workDays) {
    if(!workDays) workDays = [];
    let keyboard = daysOfWeek.map(day => {
        const isSelected = workDays.includes(day.id);
        const buttonText = isSelected ? `✅ ${day.text}` : day.text;
        return Markup.button.callback(buttonText, `day_${day.id}`);
    });
    keyboard.push(Markup.button.callback('Подтвердить', `confirm_days`));
    return Markup.inlineKeyboard(
        keyboard,
        { columns: 3 }
    ).resize();
    
}

const generateDateKeyboard2 = (month, year, confirm_button = false) => {
    const toMatrix = (arr, width) => 
        arr.reduce((rows, key, index) => (index % width == 0 ? rows.push([key]) 
          : rows[rows.length-1].push(key)) && rows, []);
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let buttons = [];

    for (let day = 1; day <= daysInMonth; day++) {
        buttons.push(
            Markup.button.callback(day.toString(), `date_${day}_${month + 1}_${year}`)
        );
    }

    const dateStr = (new Date(year,month)).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long' })

    buttons = toMatrix(buttons, 7);
    buttons.unshift([Markup.button.callback(dateStr, 'inactive')])
    const monthButtons = [
        Markup.button.callback('⬅️ Месяц', `change_prev_month_${month}_${year}`),
        Markup.button.callback('➡️ Месяц', `change_next_month_${month}_${year}`)
    ];

    const yearButtons = [
        Markup.button.callback('⬅️ Год', `change_prev_year_${month}_${year}`),
        Markup.button.callback('➡️ Год', `change_next_year_${month}_${year}`)
    ];

    buttons.push(monthButtons);
    buttons.push(yearButtons);
    
    if(confirm_button)
        buttons.push([Markup.button.callback('Завершить выбор дат', 'finish_dates')])

    return Markup.inlineKeyboard(buttons);
};


module.exports = {
    generateTimeKeyboard,
    generateWeekdayKeyboard,
    generateDateKeyboard2,
    generateWorkDaysKeyboard,
    daysOfWeek
};