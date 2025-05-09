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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Moderator = exports.Worker = exports.Customer = exports.User = void 0;
const typeorm_1 = require("typeorm");
const bcrypt_1 = __importDefault(require("bcrypt"));
let User = class User {
    id;
    telegramId;
    role;
    name;
    photo;
    phone;
    scene;
    step;
    balance;
    isActive;
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ unique: true }),
    __metadata("design:type", Number)
], User.prototype, "telegramId", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "photo", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], User.prototype, "scene", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], User.prototype, "step", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "balance", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: true }),
    __metadata("design:type", Boolean)
], User.prototype, "isActive", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)()
], User);
let Customer = class Customer {
    id;
    user;
    company;
    additionalContacts;
    paymentTerms;
    documentPath;
};
exports.Customer = Customer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Customer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User)
], Customer.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "additionalContacts", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], Customer.prototype, "paymentTerms", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Customer.prototype, "documentPath", void 0);
exports.Customer = Customer = __decorate([
    (0, typeorm_1.Entity)()
], Customer);
let Worker = class Worker {
    id;
    user;
    metro;
    location;
    address;
    workTimeStart; // Время в формате "HH:mm"
    workTimeEnd; // Время в формате "HH:mm"
    paymentDetails;
    rating;
    weeklyIncome;
    //For driver
    vehicleDetails;
    //For rigger
    hasStraps;
    //For dismantler
    hasTools;
    //For loader
    hasFurnitureTools;
    //For handyman
    workInRegion;
    bonus;
    declinedTasks;
    lateTasks;
    completedTasks;
};
exports.Worker = Worker;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Worker.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User)
], Worker.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "metro", void 0);
__decorate([
    (0, typeorm_1.Column)("json", { nullable: true }),
    __metadata("design:type", Object)
], Worker.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)("time", { nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "workTimeStart", void 0);
__decorate([
    (0, typeorm_1.Column)("time", { nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "workTimeEnd", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Worker.prototype, "paymentDetails", void 0);
__decorate([
    (0, typeorm_1.Column)("float", { nullable: false, default: 5.0 }),
    __metadata("design:type", Number)
], Worker.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.Column)("float", { default: 0 }),
    __metadata("design:type", Number)
], Worker.prototype, "weeklyIncome", void 0);
__decorate([
    (0, typeorm_1.Column)("json", { nullable: true }),
    __metadata("design:type", Object)
], Worker.prototype, "vehicleDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: false }),
    __metadata("design:type", Boolean)
], Worker.prototype, "hasStraps", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: false }),
    __metadata("design:type", Boolean)
], Worker.prototype, "hasTools", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: false }),
    __metadata("design:type", Boolean)
], Worker.prototype, "hasFurnitureTools", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true, default: false }),
    __metadata("design:type", Boolean)
], Worker.prototype, "workInRegion", void 0);
__decorate([
    (0, typeorm_1.Column)('float', { nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Worker.prototype, "bonus", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Worker.prototype, "declinedTasks", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Worker.prototype, "lateTasks", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Worker.prototype, "completedTasks", void 0);
exports.Worker = Worker = __decorate([
    (0, typeorm_1.Entity)()
], Worker);
let Moderator = class Moderator {
    id;
    user;
    password;
    async hashPassword() {
        if (this.password) {
            const saltRounds = 7;
            this.password = await bcrypt_1.default.hash(this.password, saltRounds);
        }
    }
    async comparePassword(plainPassword) {
        return bcrypt_1.default.compare(plainPassword, this.password);
    }
};
exports.Moderator = Moderator;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Moderator.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => User),
    (0, typeorm_1.JoinColumn)({ name: "userId" }),
    __metadata("design:type", User)
], Moderator.prototype, "user", void 0);
__decorate([
    (0, typeorm_1.Column)(),
    __metadata("design:type", String)
], Moderator.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], Moderator.prototype, "hashPassword", null);
exports.Moderator = Moderator = __decorate([
    (0, typeorm_1.Entity)()
], Moderator);
module.exports = {
    User,
    Customer,
    Worker,
    Moderator
};
