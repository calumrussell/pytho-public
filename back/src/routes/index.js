"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dataRoutes = void 0;
const suggest_1 = require("./suggest");
const alator_1 = require("./alator");
const antevorta_1 = require("./antevorta");
const risk_1 = require("./risk");
const user_1 = require("./user");
const dataRoutes = (fastify, _opts, done) => {
    fastify.get('/suggest', { schema: suggest_1.schema }, (0, suggest_1.handler)(fastify));
    fastify.post('/backtest', { schema: alator_1.schema }, (0, alator_1.handler)(fastify));
    fastify.post('/incomesim', { schema: antevorta_1.schema }, (0, antevorta_1.handler)(fastify));
    fastify.get('/riskattribution', { schema: risk_1.schema }, (0, risk_1.handler)(fastify));
    fastify.get('/create', (0, user_1.createHandler)(fastify));
    fastify.post('/login', (0, user_1.loginHandler)(fastify));
    fastify.get('/logout', (0, user_1.logoutHandler)(fastify));
    done();
};
exports.dataRoutes = dataRoutes;
