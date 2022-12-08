import { FastifyInstance, FastifyPluginOptions } from "fastify";

import { handler as suggestHandler, schema as suggestSchema } from "./suggest";
import { handler as alatorHandler, schema as alatorSchema } from "./alator";
import { handler as antevortaHandler, schema as antevortaSchema } from "./antevorta";
import { handler as riskHandler, schema as riskSchema } from "./risk";
import { loginHandler, createHandler, logoutHandler } from "./user";

export const dataRoutes = (fastify: FastifyInstance, _opts: FastifyPluginOptions, done: (err?: Error) => void) => {
  fastify.get('/suggest', { schema: suggestSchema }, suggestHandler(fastify));
  fastify.post('/backtest', { schema: alatorSchema }, alatorHandler(fastify));
  fastify.post('/incomesim', { schema: antevortaSchema }, antevortaHandler(fastify));
  fastify.get('/riskattribution', { schema: riskSchema }, riskHandler(fastify));
  fastify.get('/create', createHandler(fastify));
  fastify.post('/login', loginHandler(fastify));
  fastify.get('/logout', logoutHandler(fastify));
  done();
};
