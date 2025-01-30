class User {
    constructor(id, telegramId, role, name, photo, phone, scene, step, balance) {
        this.id = id; // уникальный идентификатор
        this.telegramId = telegramId; // ID пользователя в Telegram
        this.role = role; // Роль пользователя
        this.name = name; // Имя пользователя
        this.photo = photo; // URL фотографии пользователя
        this.phone = phone; // Телефонный номер пользователя
        this.scene = scene; // Последняя сцена пользователя
        this.step = step // Последний шаг в сцене пользователя
        this.balance = balance || 0;
    }
}

class Customer extends User {
    constructor(id, telegramId, role, name, photo, phone, scene, step, balance, company, additionalContacts, paymentTerms, documentPath) {
        super(id, telegramId, role, name, photo, phone, scene, step, balance);
        this.company = company || null; // Название компании (необязательно)
        this.additionalContacts = additionalContacts;
        this.paymentTerms = paymentTerms || false; // Условия оплаты
        this.documentPath = documentPath || null; // Путь к документу (необязательно)
    }
}

class Worker extends User{
    constructor(id, telegramId, role, name, photo, phone, scene, step, balance, metro, location, address, workTimeStart, workTimeEnd, paymentDetails, rating, weeklyIncome, vehicleDetails, hasStraps, hasTools, hasFurnitureTools, workInRegion, bonus, declinedTasks, lateTasks, completedTasks) {
        super(id, telegramId, role, name, photo, phone, scene, step, balance);
        this.metro = metro; // Станция метро
        this.location = location || { longitude: null, latitude: null }; // Локация работника
        this.address = address || "";
        this.workTimeStart = workTimeStart || null; // Рабочее время
        this.workTimeEnd = workTimeEnd || null; // Рабочее время
        this.paymentDetails = paymentDetails || null; // Детали оплаты
        this.rating = rating || 5.0; // Рейтинг работника
        this.weeklyIncome = weeklyIncome || 0; // Еженедельный доход

        // Данные о транспортном средстве (для водителей)
        this.vehicleDetails = vehicleDetails || {
            length: null,
            width: null,
            height: null,
            volume: null,
            capacity: null,
            brand: null,
            availableSpots: null
        };

        // Уникальные характеристики работника
        this.hasStraps = hasStraps || false; // Есть ли ремни (для такелажников)
        this.hasTools = hasTools || false; // Есть ли инструменты (для монтажников)
        this.hasFurnitureTools = hasFurnitureTools || false; // Есть ли мебельные инструменты (для грузчиков)
        this.workInRegion = workInRegion || false; // Работает ли в регионе (для мастеров на все руки)
        this.bonus = bonus || 0;
        this.declinedTasks = declinedTasks || 0;
        this.lateTasks = lateTasks || 0;
        this.completedTasks = completedTasks || 0;
    }
}


module.exports = {
    User,
    Customer,
    Worker
};