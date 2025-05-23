const metro_stations = ['Автово', 'Адмиралтейская', 'Академическая', 'Балтийская',
    'Беговая', 'Бухарестская', 'Василеостровская', 'Владимирская',
    'Волковская', 'Выборгская', 'Горьковская', 'Гостиный двор',
    'Гражданский', 'проспект', 'Девяткино',
    'Достоевская', 'Елизаровская', 'Звёздная', 'Звенигородская',
    'Кировский завод', 'Комендантский проспект', 'Крестовский остров',
    'Купчино', 'Ладожская', 'Ленинский проспект', 'Лесная',
    'Лиговский', 'проспект', 'Ломоносовская', 'Маяковская', 'Международная',
    'Московская', 'Московские ворота', 'Нарвская', 'Невский проспект',
    'Новокрестовская', 'Новочеркасская', 'Обводный канал', 'Обухово', 'Озерки', 'Парк Победы',
    'Парнас', 'Петроградская', 'Пионерская', 'Площадь Александра Невского-1',
    'Площадь Александра Невского-2', 'Площадь Восстания', 'Площадь Ленина',
    'Площадь Мужества', 'Политехническая', 'Приморская', 'Пролетарская',
    'Проспект Большевиков', 'Проспект Ветеранов', 'Проспект Просвещения',
    'Пушкинская', 'Рыбацкое', 'Садовая', 'Сенная площадь', 'Спасская',
    'Спортивная', 'Старая Деревня', 'Технологический институт', 'Удельная', 'Улица Дыбенко',
    'Фрунзенская', 'Чёрная река', 'Чернышевская', 'Чкаловская', 'Электросила'];

const daysOfWeek = [
    {text:'Понедельник', id:'monday'}, 
    {text:'Вторник', id:'tuesday'}, 
    {text:'Среда', id:'wednesday'}, 
    {text:'Четверг', id:'thursday'}, 
    {text:'Пятница', id:'friday'}, 
    {text:'Суббота', id:'saturday'}, 
    {text:'Воскресенье', id:'sunday'}
];

const workerInfoSessionMock = {
    isOldUser: true,
    role: 'handyman',
    workerInfo: {
        fullName: 'Привет Сосед Как',
        location: { latitude: 57.275158, longitude: 55.295751 },
        metroStation: 'Рыбацкое',
        paymentDetails: '1234567898765432',
        photo: 'AgACAgIAAxkBAAIGjmc9R0G3B3RscsYD9mLngwN-F8upAAKx4TEb10DxSdMAAaRNgXf5qgEAAwIAA3kAAzYE',
        workDays: [ 'monday', 'wednesday', 'friday' ],
        startTime: 2,
        endTime: 22,
        phone: '89857497845',
        handymanInfo: true
    }
}

module.exports = { metro_stations, daysOfWeek, workerInfoSessionMock};