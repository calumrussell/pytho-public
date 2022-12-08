"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.handler = void 0;
const api_1 = require("../api");
const error_1 = require("./error");
;
const handler = (fastify) => async (request, reply) => {
    const res = await api_1.Issuer.suggestIssuer(fastify, request.query.s);
    if (res._tag === "None") {
        //Superfluous, but this is here to maintain the API structure for cases
        //in which this is relevant
        return reply.send({ "data": [] });
    }
    else {
        return reply.send({ "data": res.value });
    }
};
exports.handler = handler;
const queryStringSchema = {
    type: 'object',
    required: ['s'],
    properties: {
        s: {
            type: 'string',
        }
    },
};
const responseSchema = {
    ...error_1.errorSchema,
    200: {
        type: 'object',
        properties: {
            data: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'number',
                        },
                        country_name: {
                            type: 'string',
                        },
                        name: {
                            type: 'string',
                        },
                        issuer: {
                            type: 'string',
                        },
                        currency: {
                            type: 'string',
                        },
                        ticker: {
                            type: 'string',
                        },
                        security_type: {
                            type: 'string',
                        },
                        asset_class: {
                            type: 'string',
                        },
                        exchange: {
                            type: 'string',
                        },
                    }
                }
            }
        }
    }
};
exports.schema = {
    querystring: queryStringSchema,
    response: responseSchema,
};
