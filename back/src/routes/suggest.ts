import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

import { Issuer } from "../api";
import { errorSchema } from "./error";

interface SuggestQuerystring {
  s: string,
};

type SuggestRequest = FastifyRequest<{
  Querystring: SuggestQuerystring,
}>;


export const handler = (fastify: FastifyInstance) => async (request: SuggestRequest, reply: FastifyReply) => {
  const res = await Issuer.suggestIssuer(fastify, request.query.s);
  if (res._tag === "None") {
    //Superfluous, but this is here to maintain the API structure for cases
    //in which this is relevant
    return reply.send({"data": []});
  } else {
    return reply.send({"data": res.value});
  }
};

const queryStringSchema = {
  type: 'object',
  required: ['s'],
  properties: {
    s: {
      type: 'string',

    }
  },
}

const responseSchema = {
  ...errorSchema,
  200: {
    type: 'object',
    properties: {
      data: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
            },
            country_name: {
              type: 'string',
            },
            name: {
              type: 'string',
            },
            issuer: {
              type: 'string',
            },
            currency: {
              type: 'string',
            },
            ticker: {
              type: 'string',
            },
            security_type: {
              type: 'string',
            },
            asset_class: {
              type: 'string',
            },
            exchange: {
              type: 'string',
            },
          }
        }
      }
    }
  }
};

export const schema = {
  querystring: queryStringSchema,
  response: responseSchema,
};
