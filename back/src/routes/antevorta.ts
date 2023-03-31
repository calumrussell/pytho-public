import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { antevorta } from '../../lib/panacea/pkg/panacea';
import { EodSource, Issuer } from "../api";
import { errorSchema } from "./error";

interface AntevortaInput {
  assets: Array<string>,
  close: Array<Array<EodSource.Row>>,
  weights: Map<string, number>,
  sim_length: number,
  runs: number,
  config: string,
  inflation_mu: number,
  inflation_var: number,
  //This is created on the server if the user doesn't pass a date
  start_date: number,
}

interface AntevortaRequestBody {
  assets: Array<number>,
  weights: Array<number>,
  sim_length: number,
  runs: number,
  sim_config: string,
  inflation_mu: number,
  inflation_var: number,
};

type AntevortaRequest = FastifyRequest<{
  Body: AntevortaRequestBody,
}>;

export const handler = (fastify: FastifyInstance) => async (request: AntevortaRequest, reply: FastifyReply) => {
  const {
    weights,
    assets,
    sim_length,
    runs,
    sim_config,
    inflation_mu,
    inflation_var,
  } = request.body;
  
  try {
    const assetIssuers = await Issuer.getIssuers(fastify, assets);
    if (assetIssuers._tag === "None") {
      throw Error("Missing issuer");
    }
    const assetTickers = assetIssuers.value.map((res: Issuer.Row) => res.ticker);
    const assetData = await EodSource.getPricesFlat(assetTickers);
    if (assetData._tag === "None" || assetData.value.length === 0) {
      throw Error("Missing data for issuer");
    }

    let mappedWeights = new Map();
    weights.forEach((weight, i) => {
      mappedWeights.set(assets[i].toString(), Number(weight));
    });

    const input: AntevortaInput = {
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

    let res = { data: antevorta(input) };
    return reply.send(res);
  } catch (e) {
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
};

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
  ...errorSchema,
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
}

export const schema = {
  body: bodySchema,
  response: responseSchema,
};
