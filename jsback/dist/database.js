"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppDataSource = void 0;
const typeorm_1 = require("typeorm");
require("reflect-metadata");
const isCompiled = __filename.endsWith('.js'); // Определяем, запускаемся ли мы из компиляции
const entitiesPath = isCompiled
    ? __dirname + "/entities/*.js" // Для production
    : __dirname + "/entities/*.ts"; // Для разработки
exports.AppDataSource = new typeorm_1.DataSource({
    type: "sqlite",
    database: "./data/database.sqlite",
    synchronize: true,
    logging: false,
    entities: [entitiesPath],
});
