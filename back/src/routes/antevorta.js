"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.handler = void 0;
const panacea_1 = require("../../lib/panacea/pkg/panacea");
const api_1 = require("../api");
const error_1 = require("./error");
;
const handler = (fastify) => async (request, reply) => {
    const { weights, assets, sim_length, runs, sim_config, } = request.body;
    try {
        const assetIssuers = await api_1.Issuer.getIssuers(fastify, assets);
        if (assetIssuers._tag === "None") {
            throw Error("Missing issuer");
        }
        const assetTickers = assetIssuers.value.map((res) => res.ticker);
        const assetData = await api_1.EodSource.getPrices(assetTickers);
        if (assetData._tag === "None" || assetData.value.length === 0) {
            throw Error("Missing data for issuer");
        }
        const mergedData = assetData.value.mergeOnSource(assets);
        const dates = assetData.value.getOverlappingDates();
        if (dates._tag === "None") {
            throw Error("No dates");
        }
        if (dates.value.length === 0) {
            throw Error("No overlapping dates");
        }
        const closeData = new Map();
        mergedData.forEach((value, key) => {
            //Because we haven't merged, this will only return one series
            closeData.set(key.toString(), [...value.getAdjustedClose().values()].flat());
        });
        let mappedWeights = new Map();
        weights.forEach((weight, i) => {
            mappedWeights.set(assets[i].toString(), Number(weight));
        });
        const input = {
            assets: assets.map(a => a.toString()),
            weights: mappedWeights,
            dates: dates.value,
            close: closeData,
            sim_length,
            runs,
            config: sim_config,
        };
        let res = { data: (0, panacea_1.antevorta)(input) };
        console.log(res);
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
                    values: {
                        type: 'array',
                        items: {
                            type: 'number',
                        },
                    },
                },
            }
        },
    }
};
exports.schema = {
    body: bodySchema,
    response: responseSchema,
};
