"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
const fastify_1 = __importDefault(require("fastify"));
const session_1 = __importDefault(require("@fastify/session"));
const cookie_1 = __importDefault(require("@fastify/cookie"));
const db_1 = require("./api/db");
const routes_1 = require("./routes");
;
;
const sessionOptions = () => ({
    store: new (require('connect-pg-simple')(session_1.default))({
        pool: new pg_1.Pool(),
        tableName: 'api_sess',
        createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ? process.env.SESSION_SECRET : "",
    cookie: { secure: false, maxAge: 86400 * 30 },
});
const build = (opts) => {
    const app = (0, fastify_1.default)(opts);
    app.register(cookie_1.default);
    app.register(session_1.default, sessionOptions());
    app.register(db_1.db);
    app.register(routes_1.dataRoutes);
    app.register(require('@fastify/cors'), (_instance) => {
        return (_req, callback) => {
            const options = { origin: true };
            callback(null, options);
        };
    });
    app.addHook('onClose', async (instance) => {
        instance.db.end();
    });
    app.get('/', (request, reply) => {
        return reply.send({ hello: 'world' });
    });
    return app;
};
module.exports = build;
