"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server = require('./app')({
    logger: {
        level: 'info',
        transport: {
            target: 'pino-pretty'
        }
    }
});
server.listen({ port: process.env.API_PORT, host: process.env.API_HOST }, (err) => {
    if (err) {
        server.log.error(err);
        process.exit(1);
    }
});
