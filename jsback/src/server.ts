import app from "./app";
import http from 'http';
import fs from 'fs';
import config from "./config";

const PORT = config.port;

const httpsServer = http.createServer(app);

httpsServer.listen(PORT, () => {
    console.log(`Server is running on ${config.self}`);
});
