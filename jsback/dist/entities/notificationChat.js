"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationChat = void 0;
const typeorm_1 = require("typeorm");

let NotificationChat = class NotificationChat {
    id;
    chatId;
    chatTitle;
    chatType;
    active;
    createdAt;
};
exports.NotificationChat = NotificationChat;

__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], NotificationChat.prototype, "id", void 0);

__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", String)
], NotificationChat.prototype, "chatId", void 0);

__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], NotificationChat.prototype, "chatTitle", void 0);

__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], NotificationChat.prototype, "chatType", void 0);

__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], NotificationChat.prototype, "active", void 0);

__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], NotificationChat.prototype, "createdAt", void 0);

exports.NotificationChat = NotificationChat = __decorate([
    (0, typeorm_1.Entity)()
], NotificationChat);