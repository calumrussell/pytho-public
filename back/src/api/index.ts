import { FastifyInstance } from 'fastify';
import { IncomingMessage } from 'http';
import https from 'https';
var crypto = require("crypto");

import { queryBuilder } from './db';
import { Option, some, none } from '../common';

const baseUrl = "https://eodhistoricaldata.com/api";

const request = async (path: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    let raw = "";
    https.get(path, (resp: IncomingMessage) => {
      resp.on('data', (chunk: string) => raw+=chunk);
      resp.on('end', () => resolve(raw));
    }).on('error', (e) => {
      console.log(e);
      return reject();
    })  
  });
}

export namespace EodSource {

  export interface Row {
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    adjusted_close: number,
    volume: number,
  };

  export const getPriceFlat = async (ticker: string): Promise<Option<Array<Row>>> => {
    const url = `${baseUrl}/eod/${ticker}?api_token=${process.env.EOD_TOKEN}&fmt=json`;
    try {
      const res = await request(url);
      return some(JSON.parse(res));
    } catch (e) {
      console.log(e);
      return none();
    }
  };

  export const getPricesFlat = async(tickers: Array<string>): Promise<Option<Array<Array<Row>>>> => {
    try {
      const requests = await Promise.all(tickers.map(ticker => getPriceFlat(ticker)));

      const values = requests.map(r => {
        if (r._tag === "None") {
          throw Error();
        } else {
          return r.value;
        }
      });
      return some(values);
    } catch (e) {
      console.log(e);
      return none();
    }
  }
}

export namespace User {
  export interface Row {
    user_key: string,
  };

  export const getUser = async (fastify: FastifyInstance, user_key: string): Promise<Option<Row>> => {
    try {
      const { rows } = await fastify.query(queryBuilder.getUser(), [user_key]);
      if (rows.length === 0) {
        return none();
      } else {
        return some(rows[0]);
      }
    } catch (e) {
      console.log(e);
      return none();
    }
  };

  export const insertUser = async (fastify: FastifyInstance): Promise<string | boolean> => {
    try {
      const user_key = crypto.randomBytes(15).toString('hex');
      const _res = await fastify.query(queryBuilder.insertUser(), [user_key]);
      return user_key;
    } catch (e) {
      console.log(e);
      return false;
    }
  };
}

export namespace Issuer {

  export interface Row {
    id: number,
    country_name: string,
    name: string,
    issuer: string,
    currency: string,
    ticker: string,
    security_type: string,
    asset_class: string | null,
    exchange: string | null,
  };

  export const getIssuer = async (fastify: FastifyInstance, id: number): Promise<Option<Row>> => {
    try {
      const { rows } = await fastify.query(queryBuilder.getIssuer(), [id]);
      if (rows.length === 0) {
        return none();
      } else {
        return some(rows[0]);
      }
    } catch (e) {
      console.log(e);
      return none();
    }
  };

  //This needs it's own SQL query, we don't need to perform parallel queries
  export const getIssuers = async (fastify: FastifyInstance, ids: Array<number>): Promise<Option<Array<Row>>> => {
    try {
      const requests = await Promise.all(ids.map(id => getIssuer(fastify, id)));
      const values = requests.map(r => {
        if (r._tag === "None") {
          throw Error();
        } else {
          return r.value;
        }
      });
      return some(values);
    } catch (e) {
      console.log(e);
      return none();
    }
  };

  export const suggestIssuer = async (fastify: FastifyInstance, suggest: string): Promise<Option<Array<Row>>> => {
    try {
      let formattedString = `%${suggest.toLowerCase()}%`; 
      const { rows } = await fastify.query(queryBuilder.suggestIssuer(), [formattedString]);
      return some(rows);
    } catch (e) {
      console.log(e);
      return none();
    }
  };
}
