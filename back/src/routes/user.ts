import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
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

const createResponse = {
  ...errorSchema,
  200: {
    type: 'object',
    properties: {
      userKey: {
        type: 'string',
      }
    }
  }
};

export const createSchema = {
  response: createResponse,
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
      return reply.status(200).send({userKey});
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

const loginBodyRequest = {
  type: 'object',
  properties: {
    userKey: {
      type: 'string',
    }
  },
};

const loginResponse = {
  ...errorSchema,
  200: {
    type: 'object',
    properties : {
      userKey: {
        type: 'string',
      },
    },
  },
};

export const loginSchema = {
  body: loginBodyRequest,
  respone: loginResponse,
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
 
