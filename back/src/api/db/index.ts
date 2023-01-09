import { FastifyInstance, FastifyPluginOptions } from "fastify";

import fp from 'fastify-plugin';
import { Pool } from 'pg';

const innerDB = (fastify: FastifyInstance, _opts: FastifyPluginOptions, done: (err?: Error) => void) => {
  //Uses env by default
  const pool = new Pool();

  const defaultHandler = (query: string, values: any[]) => {
    return pool.query(query, values);
  }

  fastify.decorate('db', pool);
  fastify.decorate('query', defaultHandler);
  done();
}

const db = fp(innerDB);

const suggestIssuer = () => {
  return "select * from api_coverage where to_tsvector('english', issuer) @@ plainto_tsquery('english', $1) or to_tsvector('english', ticker) @@ plainto_tsquery('english', $1);";
};

const getIssuer = () => {
  return "select * from api_coverage where id=$1";
};

const getUser = () => {
  return "select * from api_user where user_key=$1";
};

const insertUser = () => {
  return "insert into api_user(user_key) values($1)";
};

const queryBuilder = {
  suggestIssuer,
  getIssuer,
  getUser,
  insertUser,
}

export {
  db,
  queryBuilder,
}
