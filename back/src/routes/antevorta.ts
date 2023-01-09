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
}

interface AntevortaRequestBody {
  assets: Array<number>,
  weights: Array<number>,
  sim_length: number,
  runs: number,
  sim_config: string,
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
}

export const schema = {
  body: bodySchema,
  response: responseSchema,
};
