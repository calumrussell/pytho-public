import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { EodSource, Issuer } from '../api';
import { errorSchema } from "./error";
import { risk } from '../../lib/panacea/pkg/panacea';

interface RiskRequestQuerystring {
  ind: Array<number>,
  dep: number,
};

type RiskRequest = FastifyRequest<{
  Querystring: RiskRequestQuerystring,
}>;

interface RiskInput {
  dep: number,
  ind: Array<number>,
  data: Array<Array<EodSource.Row>>,
}

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
    const data = await EodSource.getPricesFlat(assetTickers);
    if (data._tag === "None") {
      throw Error("Missing data");
    }

    //TODO: this has to be changed when we can add more independent
    if (data.value.length != [dep, ...ind].length) {
      throw Error("Missing data");
    }

    let input: RiskInput = {
      dep,
      ind,
      data: data.value,
    };

    let result = risk(input);
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
