"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStateSchema = exports.getUserStateHandler = exports.removeFinancialPlanSchema = exports.removeFinancialPlanHandler = exports.removePortfolioSchema = exports.removePortfolioHandler = exports.addFinancialPlanSchema = exports.addFinancialPlanHandler = exports.addPortfolioSchema = exports.addPortfolioHandler = exports.logoutSchema = exports.logoutHandler = exports.loginSchema = exports.loginHandler = exports.createSchema = exports.createHandler = void 0;
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
exports.createSchema = {
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                userKey: {
                    type: 'string',
                },
            },
        },
    },
};
;
const loginHandler = (fastify) => async (request, reply) => {
    try {
        const user_key = await api_1.User.getUser(fastify, request.body.userKey);
        if (user_key._tag === "Some") {
            request.session.set("userKey", user_key);
            await request.session.save();
            const userKey = user_key.value.user_key;
            const plansResult = await api_1.User.getFinancialPlanByUser(fastify, userKey);
            let plans;
            if (plansResult._tag === "None") {
                plans = [];
            }
            else {
                plans = plansResult.value;
            }
            const portfoliosResult = await api_1.User.getPortfolioByUser(fastify, userKey);
            let portfolios;
            if (portfoliosResult._tag === "None") {
                portfolios = [];
            }
            else {
                portfolios = portfoliosResult.value;
            }
            return reply.status(200).send({ userKey, plans, portfolios });
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
exports.loginSchema = {
    body: {
        type: 'object',
        properties: {
            userKey: {
                type: 'string',
            }
        },
    },
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                userKey: {
                    type: 'string',
                },
                plans: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            userKey: { type: 'string' },
                            name: { type: 'string' },
                            plan: { type: 'string' },
                        },
                    },
                },
                portfolios: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: { type: 'number' },
                            userKey: { type: 'string' },
                            name: { type: 'string' },
                            portfolio: {
                                type: 'object',
                                properties: {
                                    assets: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'number' },
                                                name: { type: 'string' },
                                            },
                                        },
                                    },
                                    weights: {
                                        type: 'array',
                                        items: {
                                            type: 'number',
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
    }
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
exports.logoutSchema = {
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                ok: {
                    type: 'boolean',
                },
            },
        },
    }
};
;
const addPortfolioHandler = (fastify) => async (request, reply) => {
    try {
        //If this fails, it triggers catch outside
        await api_1.User.insertPortfolioByUser(fastify, request.body.userKey, request.body.name, request.body.portfolio);
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
exports.addPortfolioHandler = addPortfolioHandler;
exports.addPortfolioSchema = {
    body: {
        type: 'object',
        required: ['userKey', 'portfolio', 'name'],
        properties: {
            userKey: {
                type: 'string',
            },
            name: {
                type: 'string',
            },
            portfolio: {
                type: 'string',
            }
        }
    },
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                ok: {
                    type: 'boolean',
                },
            },
        },
    }
};
;
const addFinancialPlanHandler = (fastify) => async (request, reply) => {
    try {
        //If this fails, it triggers catch outside
        await api_1.User.insertFinancialPlanByUser(fastify, request.body.userKey, request.body.name, request.body.plan);
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
exports.addFinancialPlanHandler = addFinancialPlanHandler;
exports.addFinancialPlanSchema = {
    body: {
        type: 'object',
        required: ['userKey', 'name', 'plan'],
        properties: {
            userKey: {
                type: 'string',
            },
            plan: {
                type: 'string',
            },
            name: {
                type: 'string',
            }
        }
    },
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                ok: {
                    type: 'boolean',
                },
            },
        },
    }
};
;
const removePortfolioHandler = (fastify) => async (request, reply) => {
    try {
        const _res = await api_1.User.removePortfolioByUser(fastify, request.query.userKey, request.query.name);
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
exports.removePortfolioHandler = removePortfolioHandler;
exports.removePortfolioSchema = {
    query: {
        type: 'object',
        required: ['userKey', 'name'],
        properties: {
            userKey: {
                type: 'string',
            },
            name: {
                type: 'string',
            },
        }
    },
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                ok: { type: 'boolean' },
            },
        },
    },
};
;
const removeFinancialPlanHandler = (fastify) => async (request, reply) => {
    try {
        const _res = await api_1.User.removeFinancialPlanByUser(fastify, request.query.userKey, request.query.name);
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
exports.removeFinancialPlanHandler = removeFinancialPlanHandler;
exports.removeFinancialPlanSchema = {
    query: {
        type: 'object',
        required: ['userKey', 'name'],
        properties: {
            userKey: {
                type: 'string',
            },
            name: {
                type: 'string',
            },
        }
    },
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                ok: { type: 'boolean' },
            },
        },
    },
};
;
const getUserStateHandler = (fastify) => async (request, reply) => {
    try {
        const financialPlansResult = await api_1.User.getFinancialPlanByUser(fastify, request.query.userKey);
        const portfoliosResult = await api_1.User.getPortfolioByUser(fastify, request.query.userKey);
        let plans;
        if (financialPlansResult._tag === "None") {
            plans = [];
        }
        else {
            plans = financialPlansResult.value;
        }
        let portfolios;
        if (portfoliosResult._tag === "None") {
            portfolios = [];
        }
        else {
            portfolios = portfoliosResult.value;
        }
        return reply.status(200).send({ portfolios, plans });
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
exports.getUserStateHandler = getUserStateHandler;
exports.getUserStateSchema = {
    query: {
        type: 'object',
        required: ['userKey'],
        properties: {
            userKey: {
                type: 'string',
            },
        }
    },
    response: {
        ...error_1.errorSchema,
        200: {
            type: 'object',
            properties: {
                portfolios: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
                plans: {
                    type: 'array',
                    items: {
                        type: 'string',
                    },
                },
            },
        },
    },
};
