import { DataSource } from "typeorm";
import "reflect-metadata";

const isCompiled = __filename.endsWith('.js'); // Определяем, запускаемся ли мы из компиляции
const entitiesPath = isCompiled
  ? __dirname + "/entities/*.js" // Для production
  : __dirname + "/entities/*.ts"; // Для разработки

export const AppDataSource = new DataSource({
    type: "sqlite",
    database: "./data/database.sqlite",
    synchronize: true,
    logging: false,
    entities: [entitiesPath],
});
