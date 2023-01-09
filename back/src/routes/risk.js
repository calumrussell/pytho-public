"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.handler = void 0;
const api_1 = require("../api");
const error_1 = require("./error");
const panacea_1 = require("../../lib/panacea/pkg/panacea");
;
const handler = (fastify) => async (request, reply) => {
    const { ind, dep, } = request.query;
    try {
        const assetIssuers = await api_1.Issuer.getIssuers(fastify, [dep, ...ind]);
        if (assetIssuers._tag === "None") {
            throw Error("Missing issuer");
        }
        const assetTickers = assetIssuers.value.map((res) => res.ticker);
        const data = await api_1.EodSource.getPricesFlat(assetTickers);
        if (data._tag === "None") {
            throw Error("Missing data");
        }
        //TODO: this has to be changed when we can add more independent
        if (data.value.length != [dep, ...ind].length) {
            throw Error("Missing data");
        }
        let input = {
            dep,
            ind,
            data: data.value,
        };
        let result = (0, panacea_1.risk)(input);
        return reply.status(200).send({ data: result });
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
exports.handler = handler;
const querystringSchema = {
    type: 'object',
    required: ['ind', 'dep'],
    properties: {
        ind: { type: 'array', items: { type: 'integer' } },
        dep: { type: 'number' },
    }
};
const responseSchema = {
    ...error_1.errorSchema,
    200: {
        type: 'object',
        properties: {
            data: {
                type: 'object',
                properties: {
                    dep: { type: 'integer' },
                    ind: { type: 'array', items: { type: 'integer' } },
                    min_date: { type: 'number' },
                    max_date: { type: 'number' },
                    core: {
                        type: 'object',
                        properties: {
                            regression: {
                                type: 'object',
                                properties: {
                                    coefs: {
                                        type: 'array',
                                        items: {
                                            type: 'number',
                                        }
                                    },
                                    errors: {
                                        type: 'array',
                                        items: {
                                            type: 'number',
                                        }
                                    },
                                }
                            },
                            avgs: {
                                type: 'array',
                                items: {
                                    type: 'number',
                                }
                            }
                        }
                    },
                    rolling: {
                        type: 'object',
                        properties: {
                            regressions: {
                                coefs: {
                                    type: 'array',
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'number',
                                        }
                                    }
                                },
                                errors: {
                                    type: 'array',
                                    items: {
                                        type: 'array',
                                        items: {
                                            type: 'number',
                                        }
                                    }
                                }
                            },
                            dates: {
                                type: 'array',
                                items: {
                                    type: 'integer',
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};
exports.schema = {
    querystring: querystringSchema,
    response: responseSchema,
};
