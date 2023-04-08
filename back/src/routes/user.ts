import fastify, { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { User } from "../api";
import { errorSchema } from "./error";

export const createHandler = (fastify: FastifyInstance) => async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    let user_key = await User.insertUser(fastify);
    if (user_key != false) {
      return reply.status(200).send({userKey: user_key});
    } else {
      return reply.status(500).send({statusCode: 500, message: "User creation failed"});
    }
  } catch (e) {
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
  }
};

export const createSchema = {
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        userKey: {
          type: 'string',
        },
      },
    },
  },
};

interface UserRequestBody {
  userKey: string,
};

type UserRequest = FastifyRequest<{
  Body: UserRequestBody,
}>;

export const loginHandler = (fastify: FastifyInstance) => async (request: UserRequest, reply: FastifyReply) => {
  try {
    const user_key = await User.getUser(fastify, request.body.userKey);
    if (user_key._tag === "Some") {
      request.session.set("userKey", user_key);
      await request.session.save();
      const userKey = user_key.value.user_key;

      const plansResult = await User.getFinancialPlanByUser(fastify, userKey);
      let plans: Array<User.FinancialPlan>;
      if (plansResult._tag === "None") {
        plans = [];
      } else {
        plans = plansResult.value;
      }
 
      const portfoliosResult = await User.getPortfolioByUser(fastify, userKey);
      let portfolios: Array<User.Portfolio>;
      if (portfoliosResult._tag === "None") {
        portfolios = [];
      } else {
        portfolios = portfoliosResult.value;
      }

      return reply.status(200).send({userKey, plans, portfolios});
    } else {
      return reply.status(401).send({statusCode: 401, message: "Unauthenticated"});
    }
  } catch (e) {
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
  }
}; 

export const loginSchema = {
  body: {
    type: 'object',
    properties: {
      userKey: {
        type: 'string',
      }
    },
  },
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties : {
        userKey: {
          type: 'string',
        },
        plans: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              userKey: { type: 'string' },
              name: { type: 'string' },
              plan: { type: 'string' },
            },
          },
        },
        portfolios: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              userKey: { type: 'string' },
              name: { type: 'string' },
              portfolio: { 
                type: 'object' ,
                properties: {
                  assets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'number' },
                        name: { type: 'string'},
                      },
                    },
                  },
                  weights: {
                    type: 'array',
                    items: {
                      type: 'number',
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  }
};

export const logoutHandler = (fastify: FastifyInstance) => async (request: UserRequest, reply: FastifyReply) => {
  try {
    await request.session.destroy();
    return reply.status(200).send({ok: true});
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok: false});
  }
};

export const logoutSchema = {
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        ok: {
          type: 'boolean',
        },
      },
    },
  }
}

interface AddPortfolioBody {
  userKey: string,
  name: string,
  portfolio: string,
};

type AddPortfolioRequest = FastifyRequest<{
  Body: AddPortfolioBody,
}>;

export const addPortfolioHandler = (fastify: FastifyInstance) => async (request: AddPortfolioRequest, reply: FastifyReply) => {
  try {
    //If this fails, it triggers catch outside
    await User.insertPortfolioByUser(fastify, request.body.userKey, request.body.name, request.body.portfolio);
    return reply.status(200).send({ok: true});
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok: false});
  }
}

export const addPortfolioSchema = {
  body: {
    type: 'object',
    required: ['userKey', 'portfolio', 'name'],
    properties: {
      userKey: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      portfolio: {
        type: 'string',
      }
    }
  },
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        ok: {
          type: 'boolean',
        },
      },
    },
  }
};

interface AddFinancialPlanBody {
  userKey: string,
  name: string,
  plan: string,
};

type AddFinancialPlanRequest = FastifyRequest<{
  Body: AddFinancialPlanBody,
}>;

export const addFinancialPlanHandler = (fastify: FastifyInstance) => async (request: AddFinancialPlanRequest, reply: FastifyReply) => {
  try {
    //If this fails, it triggers catch outside
    await User.insertFinancialPlanByUser(fastify, request.body.userKey, request.body.name, request.body.plan);
    return reply.status(200).send({ok: true});
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok: false});
  }
};

export const addFinancialPlanSchema = {
  body: {
    type: 'object',
    required: ['userKey', 'name', 'plan'],
    properties: {
      userKey: {
        type: 'string',
      },
      plan: {
        type: 'string',
      },
      name: {
        type: 'string',
      }
    }
  },
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        ok: {
          type: 'boolean',
        },
      },
    },
  }
};

interface RemovePortfolioQuery {
  userKey: string,
  name: string,
};

type RemovePortfolioRequest = FastifyRequest<{
  Querystring: RemovePortfolioQuery,
}>;

export const removePortfolioHandler = (fastify: FastifyInstance) => async (request: RemovePortfolioRequest, reply: FastifyReply) => {
  try {
    const _res = await User.removePortfolioByUser(fastify, request.query.userKey, request.query.name);
    return reply.status(200).send({ ok: true});
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok: false});
  }
}

export const removePortfolioSchema = {
  query: {
    type: 'object',
    required: ['userKey', 'name'],
    properties: {
      userKey: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
    }
  },
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
      },
    },
  },
};

interface RemoveFinancialPlanQuery {
  userKey: string,
  name: string,
};

type RemoveFinancialPlanRequest = FastifyRequest<{
  Querystring: RemoveFinancialPlanQuery,
}>;

export const removeFinancialPlanHandler = (fastify: FastifyInstance) => async (request: RemoveFinancialPlanRequest, reply: FastifyReply) => {
  try {
    const _res = await User.removeFinancialPlanByUser(fastify, request.query.userKey, request.query.name);
    return reply.status(200).send({ ok: true});
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok: false});
  }
}

export const removeFinancialPlanSchema = {
  query: {
    type: 'object',
    required: ['userKey', 'name'],
    properties: {
      userKey: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
    }
  },
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        ok: { type: 'boolean' },
      },
    },
  },
};

interface UserStateQueryString {
  userKey: string,
};

type UserStateRequest = FastifyRequest<{
  Querystring: UserStateQueryString,
}>;

export const getUserStateHandler = (fastify: FastifyInstance) => async (request: UserStateRequest, reply: FastifyReply) => {
  try {
    const financialPlansResult = await User.getFinancialPlanByUser(fastify, request.query.userKey);
    const portfoliosResult = await User.getPortfolioByUser(fastify, request.query.userKey);

    let plans: Array<User.FinancialPlan>;
    if (financialPlansResult._tag === "None") {
      plans = [];
    } else {
      plans = financialPlansResult.value;
    }

    let portfolios: Array<User.Portfolio>;
    if (portfoliosResult._tag === "None") {
      portfolios = [];
    } else {
      portfolios = portfoliosResult.value;
    }
    return reply.status(200).send({ portfolios, plans });
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return reply.status(400).send({statusCode: 400, ...err});
    }
    return reply.status(500).send({ok: false});
  }
}

export const getUserStateSchema = {
  query: {
    type: 'object',
    required: ['userKey'],
    properties: {
      userKey: {
        type: 'string',
      },
    }
  },
  response: {
    ...errorSchema,
    200: {
      type: 'object',
      properties: {
        portfolios: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
        plans: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
};
