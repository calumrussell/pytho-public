import { FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { Pool, QueryResult } from "pg";
import fastify from 'fastify';
import fastifySession from '@fastify/session';
import fastifyCookie from '@fastify/cookie';

import { db } from "./api/db";
import { dataRoutes } from "./routes";
import { EodSource, Issuer } from "./api";
import { backtest } from '../lib/panacea/pkg/panacea';
import { FastifyCorsOptions, FastifyCorsOptionsDelegateCallback } from "@fastify/cors";

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

interface QueryInterface {
  (query: string, values: any[]): Promise<QueryResult>;
};

declare module 'fastify' {
  interface FastifyInstance {
    query: QueryInterface,
    db: Pool, 
  }
}

const sessionOptions = () => ({
  store: new (require('connect-pg-simple')(fastifySession as any))({
    pool: new Pool(),
    tableName: 'api_sess',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET ? process.env.SESSION_SECRET: "",
  cookie: { secure: false, maxAge: 86400 * 30 },
});

const build = (opts: FastifyServerOptions) => {
  const app = fastify(opts);

  app.register(fastifyCookie);
  app.register(fastifySession, sessionOptions());
  app.register(db);
  app.register(dataRoutes);
  app.register(require('@fastify/cors'), (_instance): FastifyCorsOptionsDelegateCallback => {
    return (_req, callback) => {
      const options: FastifyCorsOptions = { origin: true };
      callback(null, options)
    }
  })
 
  app.addHook('onClose', async (instance) => {
    instance.db.end();
  });

  app.get('/', (request: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ hello: 'world' });
  })
  
  return app;
};

module.exports = build;
