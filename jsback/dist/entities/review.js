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
exports.Review = void 0;
const typeorm_1 = require("typeorm");
const task_1 = require("./task");
let Review = class Review {
    id;
    task;
    title;
    description;
    rating;
    created_at;
};
exports.Review = Review;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Review.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => task_1.Task, { nullable: false }),
    (0, typeorm_1.JoinColumn)({ name: "taskId" }),
    __metadata("design:type", task_1.Task)
], Review.prototype, "task", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: false }),
    __metadata("design:type", String)
], Review.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)("text", { nullable: false }),
    __metadata("design:type", String)
], Review.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)("float", { nullable: false }),
    __metadata("design:type", Number)
], Review.prototype, "rating", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)(),
    __metadata("design:type", Date)
], Review.prototype, "created_at", void 0);
exports.Review = Review = __decorate([
    (0, typeorm_1.Entity)()
], Review);
