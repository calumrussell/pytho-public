"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.handler = void 0;
const api_1 = require("../api");
const panacea_1 = require("../../lib/panacea/pkg/panacea");
const error_1 = require("./error");
;
const handler = (fastify) => async (request, reply) => {
    const { weights, assets, } = request.body;
    try {
        const assetIssuers = await api_1.Issuer.getIssuers(fastify, assets);
        if (assetIssuers._tag === "None") {
            throw Error("Missing issuer");
        }
        const assetTickers = assetIssuers.value.map((res) => res.ticker);
        const assetData = await api_1.EodSource.getPrices(assetTickers);
        if (assetData._tag === "None") {
            throw Error("Missing data for issuer");
        }
        const mergedData = assetData.value.mergeOnDate(0);
        let mappedWeights = new Map();
        weights.forEach((weight, i) => {
            mappedWeights.set(assets[i].toString(), Number(weight));
        });
        const alatorInput = {
            assets: assets.map(v => v.toString()),
            weights: mappedWeights,
            data: mergedData.getAdjustedClose(),
            first_date: mergedData.getFirstDate(),
            last_date: mergedData.getLastDate(),
        };
        const result = (0, panacea_1.backtest)(alatorInput);
        //Need to size up decimals
        const formattedResult = {
            ...result,
            cagr: result.cagr * 100,
            vol: result.vol * 100,
            mdd: result.mdd * 100,
            ret: result.ret * 100,
        };
        return reply.send({ "data": formattedResult });
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
    required: ['assets', 'weights'],
    properties: {
        assets: { type: 'array', items: { type: 'integer' } },
        weights: { type: 'array', items: { type: 'number' } },
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
                    ret: {
                        type: 'number',
                    },
                    cagr: {
                        type: 'number',
                    },
                    mdd: {
                        type: 'number',
                    },
                    vol: {
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
};
exports.schema = {
    body: bodySchema,
    response: responseSchema,
};
