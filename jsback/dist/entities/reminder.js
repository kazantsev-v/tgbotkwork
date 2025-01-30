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
exports.Reminder = void 0;
const typeorm_1 = require("typeorm");
const user_1 = require("./user");
let Reminder = class Reminder {
    id;
    user;
    message;
    remindAt;
    status;
    createdAt;
};
exports.Reminder = Reminder;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Reminder.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", user_1.User)
], Reminder.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], Reminder.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", Date)
], Reminder.prototype, "remindAt", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true, default: 'pending' }),
    __metadata("design:type", String)
], Reminder.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Reminder.prototype, "createdAt", void 0);
exports.Reminder = Reminder = __decorate([
    (0, typeorm_1.Entity)()
], Reminder);
