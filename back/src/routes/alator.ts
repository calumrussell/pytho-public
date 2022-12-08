import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { EodSource, Issuer } from '../api';
import { backtest } from '../../lib/panacea/pkg/panacea';
import { errorSchema } from "./error";

interface AlatorRequestBody {
  assets: Array<number>,
  weights: Array<number>,
};

type AlatorRequest = FastifyRequest<{
  Body: AlatorRequestBody,
}>;

interface AlatorInput {
  assets: Array<string>,
  weights: Map<string, number>,
  data: Map<number, Array<number>>,
  first_date: number,
  last_date: number,
}

export const handler = (fastify: FastifyInstance) => async (request: AlatorRequest, reply: FastifyReply) => {
  const {
    weights,
    assets,
  } = request.body;

  try {
    const assetIssuers = await Issuer.getIssuers(fastify, assets);
    if (assetIssuers._tag === "None") {
      throw Error("Missing issuer");
    }
    const assetTickers = assetIssuers.value.map((res: Issuer.Row) => res.ticker);
    const assetData = await EodSource.getPrices(assetTickers);
    if (assetData._tag === "None") {
      throw Error("Missing data for issuer");
    }

    const mergedData = assetData.value.mergeOnDate(0);
    let mappedWeights = new Map();
    weights.forEach((weight, i) => {
      mappedWeights.set(assets[i].toString(), Number(weight));
    });

    const alatorInput: AlatorInput = {
      assets: assets.map(v => v.toString()),
      weights: mappedWeights,
      data: mergedData.getAdjustedClose(),
      first_date: mergedData.getFirstDate(),
      last_date: mergedData.getLastDate(),
    };

    const result = backtest(alatorInput);
    //Need to size up decimals
    const formattedResult = {
      ...result,
      cagr: result.cagr * 100,
      vol: result.vol * 100,
      mdd: result.mdd * 100,
      ret: result.ret * 100,
    }
    return reply.send({"data": formattedResult});
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
}

const bodySchema = {
  type: 'object',
  required: ['assets', 'weights'],
  properties: {
    assets: { type: 'array', items: { type: 'integer' } },
    weights: { type: 'array', items: { type: 'number' } },
  }
};

const responseSchema = {
  ...errorSchema,
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
          dates : {
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

export const schema = {
  body: bodySchema,
  response: responseSchema,
};
