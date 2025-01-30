"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const http_1 = __importDefault(require("http"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("./config"));
const PORT = config_1.default.port;

const httpsServer = http_1.default.createServer(app_1.default);
httpsServer.listen(PORT, () => {
    console.log(`Server is running on ${config_1.default.self}`);
});
