// utils/validators.js

// Проверка ФИО
function validateFullName(fullName) {
    const namePattern = /^[А-ЯЁ][а-яё]+(?:\s[А-ЯЁ][а-яё]+){1,2}$/;
    return namePattern.test(fullName);
}

// Проверка названия компании
function validateCompanyName(companyName) {
    const companyPattern = /^[A-Za-zА-Яа-яЁё0-9\s]+$/;
    return companyPattern.test(companyName);
}

// Проверка номера карты
function validateCardNumber(cardNumber) {
    const cardPattern = /^\d{16}$/;
    return cardPattern.test(cardNumber);
}

// Проверка СБП (телефон или email)
function validateSBP(details) {
    return validatePhone(details);
}

function validatePhone(phone) {
    // Проверка российского телефона в формате +7XXXXXXXXXX или 8XXXXXXXXXX
    const cleanedPhone = phone.replace(/\D/g, '');
    return /^(7|8)\d{10}$/.test(cleanedPhone);
}

function validateNumericValue(value) {
    return !isNaN(value) && value > 0;
}

function validateIntegerValue(value) {
    return Number.isInteger(value) && value >= 0;
}

function validateText(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

module.exports = {
    validateFullName,
    validateCompanyName,
    validateCardNumber,
    validateSBP,
    validatePhone,
    validateNumericValue,
    validateIntegerValue,
    validateText
};
