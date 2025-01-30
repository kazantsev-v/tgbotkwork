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
exports.TaskPhoto = exports.Task = void 0;
const typeorm_1 = require("typeorm");
const user_1 = require("./user");
let Task = class Task {
    id;
    creator;
    executor;
    moderator;
    title;
    description;
    location;
    payment;
    pack_needed;
    tool_needed;
    assemble_needed;
    pack_description;
    tool_description;
    assemble_description;
    moderator_description;
    status;
    created_at;
    dates;
    duration;
    priority;
    start_time;
};
exports.Task = Task;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Task.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_1.User, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "creatorId" }),
    __metadata("design:type", user_1.User)
], Task.prototype, "creator", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "executorId" }),
    __metadata("design:type", Object)
], Task.prototype, "executor", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_1.User, { nullable: true }),
    (0, typeorm_1.JoinColumn)({ name: "moderatorId" }),
    __metadata("design:type", Object)
], Task.prototype, "moderator", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: false }),
    __metadata("design:type", String)
], Task.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: false }),
    __metadata("design:type", String)
], Task.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: false }),
    __metadata("design:type", String)
], Task.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)("float", { nullable: false }),
    __metadata("design:type", Number)
], Task.prototype, "payment", void 0);
__decorate([
    (0, typeorm_1.Column)("boolean", { default: false }),
    __metadata("design:type", Boolean)
], Task.prototype, "pack_needed", void 0);
__decorate([
    (0, typeorm_1.Column)("boolean", { default: false }),
    __metadata("design:type", Boolean)
], Task.prototype, "tool_needed", void 0);
__decorate([
    (0, typeorm_1.Column)("boolean", { default: false }),
    __metadata("design:type", Boolean)
], Task.prototype, "assemble_needed", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "pack_description", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "tool_description", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "assemble_description", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "moderator_description", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { default: "pending" }),
    __metadata("design:type", String)
], Task.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Task.prototype, "created_at", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "json", nullable: true }),
    __metadata("design:type", Array)
], Task.prototype, "dates", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "float", nullable: true }),
    __metadata("design:type", Number)
], Task.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "int", nullable: true, default: 0 }),
    __metadata("design:type", Number)
], Task.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "time", nullable: true }),
    __metadata("design:type", String)
], Task.prototype, "start_time", void 0);
exports.Task = Task = __decorate([
    (0, typeorm_1.Entity)()
], Task);
let TaskPhoto = class TaskPhoto {
    id;
    task;
    photo_url; // Ссылка на сохраненное фото
};
exports.TaskPhoto = TaskPhoto;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], TaskPhoto.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Task),
    __metadata("design:type", Task)
], TaskPhoto.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: false }),
    __metadata("design:type", String)
], TaskPhoto.prototype, "photo_url", void 0);
exports.TaskPhoto = TaskPhoto = __decorate([
    (0, typeorm_1.Entity)()
], TaskPhoto);
