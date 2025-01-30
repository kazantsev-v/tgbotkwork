"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticateToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(403).json({ message: 'Доступ запрещён. Токен отсутствует.' });
    }
    jsonwebtoken_1.default.verify(token, 'secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Неверный токен.' });
        }
        req.user = user;
        next();
    });
};
exports.authenticateToken = authenticateToken;
