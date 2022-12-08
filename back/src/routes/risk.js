"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.schema = exports.handler = void 0;
const api_1 = require("../api");
const common_1 = require("../common");
const error_1 = require("./error");
;
;
const handler = (fastify) => async (request, reply) => {
    const { ind, dep, } = request.query;
    try {
        const assetIssuers = await api_1.Issuer.getIssuers(fastify, [dep, ...ind]);
        if (assetIssuers._tag === "None") {
            throw Error("Missing issuer");
        }
        const assetTickers = assetIssuers.value.map((res) => res.ticker);
        const data = await api_1.EodSource.getPrices(assetTickers);
        if (data._tag === "None") {
            throw Error("Missing data");
        }
        //TODO: this has to be changed when we can add more independent
        if (data.value.length != [dep, ...ind].length) {
            throw Error("Missing data");
        }
        let mergedData = data.value.mergeOnDate(0);
        const monthlyReturns = mergedData.toMonthly().getReturns();
        const depData = [];
        const indData = [];
        monthlyReturns.forEach((value, _key) => {
            const [first, ...last] = value;
            depData.push([first]);
            indData.push(last);
        });
        const avgsHolder = new Array(assetTickers.length).fill(0);
        const sum = [...monthlyReturns.values()].reduce((acc, curr) => {
            return curr.map((c, i) => c + acc[i]);
        }, avgsHolder);
        const avgs = sum.map(s => parseFloat((s / depData.length).toFixed(2)));
        const coreRes = {
            regression: (0, common_1.regression)(depData, indData),
            avgs,
        };
        let rollingData = mergedData.toMonthly().convertToRolling(6);
        let rollingDates = [];
        const rollingDep = [];
        const rollingInd = [];
        rollingData.forEach((table, _key) => {
            const t0 = [];
            const t1 = [];
            [...table.getReturns().values()].forEach(value => {
                const [first, ...last] = value;
                t0.push([first]);
                t1.push(last);
            });
            rollingDep.push(t0);
            rollingInd.push(t1);
            rollingDates.push(table.getLastDate());
        });
        const rollingReg = (0, common_1.regressions)(rollingDep, rollingInd);
        const rollingRes = {
            regressions: rollingReg,
            dates: rollingDates,
        };
        const result = {
            dep,
            ind,
            min_date: mergedData.getFirstDate(),
            max_date: mergedData.getLastDate(),
            core: coreRes,
            rolling: rollingRes,
        };
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
