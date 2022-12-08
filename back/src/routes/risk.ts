import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { EodSource, Issuer } from '../api';
import { regression, regressions, RegressionResult, RegressionResults } from "../common";
import { errorSchema } from "./error";

interface RiskRequestQuerystring {
  ind: Array<number>,
  dep: number,
};

type RiskRequest = FastifyRequest<{
  Querystring: RiskRequestQuerystring,
}>;

interface CoreRegressionResult {
  regression: RegressionResult,
  avgs: Array<number>,
}

interface RollingRegressionResult {
  regressions: RegressionResults,
  dates: Array<number>,
}

interface RiskResult {
  dep: number,
  ind: Array<number>,
  min_date: number,
  max_date: number,
  core: CoreRegressionResult,
  rolling: RollingRegressionResult,
};

export const handler = (fastify: FastifyInstance) => async (request: RiskRequest, reply: FastifyReply) => {
  const {
    ind,
    dep,
  } = request.query;

  try {
    const assetIssuers = await Issuer.getIssuers(fastify, [dep, ...ind]);
    if (assetIssuers._tag === "None") {
      throw Error("Missing issuer");
    }
    const assetTickers = assetIssuers.value.map((res: Issuer.Row) => res.ticker);
    const data = await EodSource.getPrices(assetTickers);
    if (data._tag === "None") {
      throw Error("Missing data");
    }

    //TODO: this has to be changed when we can add more independent
    if (data.value.length != [dep, ...ind].length) {
      throw Error("Missing data");
    }

    let mergedData = data.value.mergeOnDate(0);

    const monthlyReturns = mergedData.toMonthly().getReturns();
    const depData: Array<Array<number>> = [];
    const indData: Array<Array<number>> = [];
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
      regression: regression(depData, indData),
      avgs,
    };

    let rollingData = mergedData.toMonthly().convertToRolling(6);
    let rollingDates: Array<number> = [];
    const rollingDep: Array<Array<Array<number>>> = [];
    const rollingInd: Array<Array<Array<number>>> = [];
    
    rollingData.forEach((table, _key) => {
      const t0: Array<Array<number>> = [];
      const t1: Array<Array<number>> = [];


      [...table.getReturns().values()].forEach(value => {
        const [first, ...last] = value;
        t0.push([first]);
        t1.push(last);
      });
      rollingDep.push(t0);
      rollingInd.push(t1);
      rollingDates.push(table.getLastDate());
    });

    const rollingReg = regressions(rollingDep, rollingInd);
    const rollingRes: RollingRegressionResult = {
      regressions: rollingReg,
      dates: rollingDates,
    };

    const result: RiskResult = {
      dep,
      ind,
      min_date: mergedData.getFirstDate(),
      max_date: mergedData.getLastDate(),
      core: coreRes,
      rolling: rollingRes,
    };
    return reply.status(200).send({data: result});
  } catch(e: unknown) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok:false});
  }
}

const querystringSchema = {
  type: 'object',
  required: ['ind', 'dep'],
  properties: {
    ind: { type: 'array', items: { type: 'integer' } },
    dep: { type: 'number' },
  }
}

const responseSchema = {
  ...errorSchema,
  200 : {
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
}

export const schema = {
  querystring: querystringSchema,
  response: responseSchema,
};
