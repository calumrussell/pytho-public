"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.handler = void 0;
const panacea_1 = require("../../lib/panacea/pkg/panacea");
const api_1 = require("../api");
const error_1 = require("./error");
;
const handler = (fastify) => async (request, reply) => {
    const { weights, assets, sim_length, runs, sim_config, inflation_mu, inflation_var, } = request.body;
    try {
        const assetIssuers = await api_1.Issuer.getIssuers(fastify, assets);
        if (assetIssuers._tag === "None") {
            throw Error("Missing issuer");
        }
        const assetTickers = assetIssuers.value.map((res) => res.ticker);
        const assetData = await api_1.EodSource.getPricesFlat(assetTickers);
        if (assetData._tag === "None" || assetData.value.length === 0) {
            throw Error("Missing data for issuer");
        }
        let mappedWeights = new Map();
        weights.forEach((weight, i) => {
            mappedWeights.set(assets[i].toString(), Number(weight));
        });
        const input = {
            assets: assets.map(a => a.toString()),
            weights: mappedWeights,
            close: assetData.value,
            sim_length,
            runs,
            config: sim_config,
            inflation_mu,
            inflation_var,
            start_date: 1680283254,
        };
        let res = { data: (0, panacea_1.antevorta)(input) };
        return reply.send(res);
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
const bodySchema = {
    type: 'object',
    properties: {
        assets: {
            type: 'array',
            items: {
                type: 'number',
            }
        },
        weights: {
            type: 'array',
            items: {
                type: 'number',
            },
        },
        sim_length: {
            type: 'number',
        },
        runs: {
            type: 'number',
        },
        sim_config: {
            type: 'string',
        },
        inflation_mu: {
            type: 'number',
        },
        inflation_var: {
            type: 'number',
        }
    },
};
const responseSchema = {
    ...error_1.errorSchema,
    200: {
        type: 'object',
        properties: {
            data: {
                type: 'object',
                properties: {
                    sample_start: {
                        type: 'number'
                    },
                    sample_end: {
                        type: 'number'
                    },
                    results: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                cash: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                gross_income: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                net_income: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                expense: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                tax_paid: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                sipp_contributions: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                ret: {
                                    type: 'number',
                                },
                                cagr: {
                                    type: 'number',
                                },
                                vol: {
                                    type: 'number',
                                },
                                mdd: {
                                    type: 'number',
                                },
                                sharpe: {
                                    type: 'number',
                                },
                                values: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                returns: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                returns_dates: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                investment_cash_flows: {
                                    type: 'array',
                                    items: {
                                        type: 'number',
                                    },
                                },
                                first_date: {
                                    type: 'number',
                                },
                                last_date: {
                                    type: 'number',
                                },
                                dd_start_date: {
                                    type: 'number',
                                },
                                dd_end_date: {
                                    type: 'number',
                                },
                                best_return: {
                                    type: 'number',
                                },
                                worst_return: {
                                    type: 'number',
                                },
                                frequency: {
                                    type: 'string',
                                },
                            }
                        }
                    }
                },
            }
        },
    }
};
exports.schema = {
    body: bodySchema,
    response: responseSchema,
};
