"use strict";
const express = require('express');
const { AppDataSource } = require('../database');
const { NotificationChat } = require('../entities/notificationChat');

const router = express.Router();
const notificationChatRepo = AppDataSource.getRepository(NotificationChat);

// Получить все чаты для уведомлений
router.get("/", async (req, res) => {
    try {
        const chats = await notificationChatRepo.find({ where: { active: true } });
        res.json(chats);
    } catch (error) {
        console.error("Ошибка при получении списка чатов для уведомлений:", error);
        res.status(500).json({ message: "Ошибка при получении списка чатов для уведомлений", error: error.message });
    }
});

// Добавить новый чат для уведомлений
router.post("/", async (req, res) => {
    const { chatId, chatTitle, chatType } = req.body;

    if (!chatId || !chatTitle || !chatType) {
        return res.status(400).json({ message: "Отсутствуют обязательные поля: chatId, chatTitle, chatType" });
    }

    try {
        // Проверяем, существует ли чат
        const existingChat = await notificationChatRepo.findOne({ where: { chatId } });
        
        if (existingChat) {
            // Если чат существует, но неактивен, активируем его
            if (!existingChat.active) {
                existingChat.active = true;
                existingChat.chatTitle = chatTitle; // Обновляем название, если оно изменилось
                await notificationChatRepo.save(existingChat);
                return res.status(200).json(existingChat);
            }
            return res.status(200).json(existingChat); // Чат уже существует и активен
        }

        // Создаем новый чат
        const newChat = notificationChatRepo.create({
            chatId,
            chatTitle,
            chatType,
            active: true,
            createdAt: new Date()
        });

        const savedChat = await notificationChatRepo.save(newChat);
        res.status(201).json(savedChat);
    } catch (error) {
        console.error("Ошибка при добавлении чата для уведомлений:", error);
        res.status(500).json({ message: "Ошибка при добавлении чата для уведомлений", error: error.message });
    }
});

// Удалить чат из списка для уведомлений (деактивировать)
router.delete("/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        const chat = await notificationChatRepo.findOne({ where: { chatId } });
        
        if (!chat) {
            return res.status(404).json({ message: "Чат не найден" });
        }

        // Вместо физического удаления, просто деактивируем
        chat.active = false;
        await notificationChatRepo.save(chat);
        
        res.status(200).json({ message: "Чат деактивирован" });
    } catch (error) {
        console.error("Ошибка при удалении чата для уведомлений:", error);
        res.status(500).json({ message: "Ошибка при удалении чата для уведомлений", error: error.message });
    }
});

// Проверить, активен ли чат для уведомлений
router.get("/:chatId", async (req, res) => {
    const { chatId } = req.params;

    try {
        const chat = await notificationChatRepo.findOne({ where: { chatId } });
        
        if (!chat) {
            return res.status(404).json({ message: "Чат не найден" });
        }

        res.status(200).json({ isActive: chat.active, chat });
    } catch (error) {
        console.error("Ошибка при проверке статуса чата:", error);
        res.status(500).json({ message: "Ошибка при проверке статуса чата", error: error.message });
    }
});

module.exports = router;