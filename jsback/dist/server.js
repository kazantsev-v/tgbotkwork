"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const config_1 = __importDefault(require("./config"));
const PORT = config_1.default.port;
const privateKey = fs_1.default.readFileSync('../privkey.pem', 'utf8');
const certificate = fs_1.default.readFileSync('../cert.pem', 'utf8');
const credentials = {
    key: privateKey,
    cert: certificate,
};
const httpsServer = https_1.default.createServer(credentials, app_1.default);
httpsServer.listen(PORT, () => {
    console.log(`Server is running on ${config_1.default.self}`);
});
