"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logoutHandler = exports.loginSchema = exports.loginHandler = exports.createSchema = exports.createHandler = void 0;
const api_1 = require("../api");
const error_1 = require("./error");
const createHandler = (fastify) => async (request, reply) => {
    try {
        let user_key = await api_1.User.insertUser(fastify);
        if (user_key != false) {
            return reply.status(200).send({ userKey: user_key });
        }
        else {
            return reply.status(500).send({ statusCode: 500, message: "User creation failed" });
        }
    }
    catch (e) {
        if (e instanceof Error) {
            const err = {
                message: e.message,
                error: e.name,
            };
            return reply.status(400).send({ statusCode: 400, ...err });
        }
    }
};
exports.createHandler = createHandler;
const createResponse = {
    ...error_1.errorSchema,
    200: {
        type: 'object',
        properties: {
            userKey: {
                type: 'string',
            }
        }
    }
};
exports.createSchema = {
    response: createResponse,
};
;
const loginHandler = (fastify) => async (request, reply) => {
    try {
        const user_key = await api_1.User.getUser(fastify, request.body.userKey);
        if (user_key._tag === "Some") {
            request.session.set("userKey", user_key);
            await request.session.save();
            const userKey = user_key.value.user_key;
            return reply.status(200).send({ userKey });
        }
        else {
            return reply.status(401).send({ statusCode: 401, message: "Unauthenticated" });
        }
    }
    catch (e) {
        if (e instanceof Error) {
            const err = {
                message: e.message,
                error: e.name,
            };
            return reply.status(400).send({ statusCode: 400, ...err });
        }
    }
};
exports.loginHandler = loginHandler;
const loginBodyRequest = {
    type: 'object',
    properties: {
        userKey: {
            type: 'string',
        }
    },
};
const loginResponse = {
    ...error_1.errorSchema,
    200: {
        type: 'object',
        properties: {
            userKey: {
                type: 'string',
            },
        },
    },
};
exports.loginSchema = {
    body: loginBodyRequest,
    respone: loginResponse,
};
const logoutHandler = (fastify) => async (request, reply) => {
    try {
        await request.session.destroy();
        return reply.status(200).send({ ok: true });
    }
    catch (e) {
        console.log(e);
        if (e instanceof Error) {
            const err = {
                message: e.message,
                error: e.name,
            };
            return reply.status(400).send({ statusCode: 400, ...err });
        }
        return reply.status(500).send({ ok: false });
    }
};
exports.logoutHandler = logoutHandler;
