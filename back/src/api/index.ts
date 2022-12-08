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

  enum Frequency {
    Daily = 0,
    Monthly = 1,
  };

  export interface Row {
    date: string,
    open: number,
    high: number,
    low: number,
    close: number,
    adjusted_close: number,
    volume: number,
  };

  export interface Table {
    //Mapped to an Array of Rows adds to the complexity of algos but means we
    //can map all merge operations to table
    _internal: Map<number, Array<Row>>,
    freq: Frequency,
    getAdjustedClose: () => Map<number, Array<number>>,
    getDates: () => Array<number>,
    getFirstDate: () => number,
    getLastDate: () => number,
    getDate: (date: number) => Option<Array<Row>>,
    getReturns: () => Map<number, Array<number>>,
    toMonthly: () => Table,
    convertToRolling: (rolling_period: number) => Array<Table>,
  }

  export interface Tables {
    _internal: Array<Table>,
    length: number,
    //TODO: merges onto adjusted_close, which is unexpected
    mergeOnDate: (freq: Frequency)  => Table,
    //TODO: merges onto adjusted_close, which is unexpected
    mergeOnSource: (assets: Array<number>) => Map<number, Table>,
    getOverlappingDates: () => Option<Array<number>>,
  };

  export const TableBuilder = (input: Map<number, Array<Row>>, freq: Frequency): Table => {
    const getDates = () => [...input.keys()]
    const getAdjustedClose = () => {
      let res = new Map();
      input.forEach((value, key) => {
        let close = value.map(v => v.adjusted_close);
        res.set(key, close);
      });
      return res;
    };
    const getFirstDate = () => getDates().slice(0, 1)[0];
    const getLastDate = () => getDates().slice(-1)[0];
    const getDate = (date: number) => input.has(date) ? some(input.get(date)) : none();
    const getReturns = () => {
      let res = new Map();
      const close = getAdjustedClose();
      const dates = [...close.keys()]
      const values = [...close.values()]

      for (let i=1; i < values.length; i++) {
        const last = values[i-1];
        const rets = values[i].map((price: number, j: number) => {
          return ((price / last[j]) - 1) * 100;
        });
        res.set(dates[i], rets);
      }
      return res;
    };

    const toMonthly = () => {
      if (freq == 1) {
        throw Error("Already Monthly frequency");
      }

      const dates = getDates();

      const monthEndDates: Array<number> = [];
      const test: Array<Date> = [];
      const existingHash = new Map();
      dates.forEach((date, i) => {
        const dateObj = new Date(date * 1000);
        const month = dateObj.getMonth();
        const year = dateObj.getFullYear();
        const key = `${month}/${year}`;
        if (!existingHash.has(key)) {
          const lastDate = new Date(dates[i-1] * 1000);
          const epoch = lastDate.getTime() / 1000;
          test.push(lastDate);
          monthEndDates.push(epoch);
          existingHash.set(key, 0);
        }
      });

      const monthly = new Map();
      monthEndDates.forEach((date: number) => {
        const row = getDate(date);
        if (row._tag === "Some") {
          monthly.set(date, row.value);
        }
      });
      return TableBuilder(monthly, 1);
    };

    const convertToRolling = (period: number): Array<Table> => {
      let keys = [...input.keys()]
      let values = [...input.values()]
      let pos = 0;

      let res: Array<Table> = [];
      values.forEach((_val, i) => {
        if (pos > period) {
          let wind = values.slice(i-period, i);
          let dates = wind.map(d => d[0].date);
          let table = new Map();
          dates.forEach((date, i) => {
            table.set(Date.parse(date) / 1000, wind[i]);
          });
          res.push(TableBuilder(table, 0));
        }
        pos++;
      });
      return res;
    };

    return {
      _internal: input,
      freq,
      getAdjustedClose,
      getFirstDate,
      getLastDate,
      getDates,
      //It is impossible for getDate to return undefined
      /* @ts-ignore */
      getDate,
      getReturns,
      toMonthly,
      convertToRolling,
    }
  };

  export const TablesBuilder = (input: Array<Table>): Tables => {
    const length = input.length;

    const getFirstAndLastDate = (): [number, number] => {
      let firstDates = input.map(i => i.getFirstDate());
      let lastDates = input.map(i => i.getLastDate());
      return [Math.max(...firstDates), Math.min(...lastDates)];
    };

    const mergeOnDate = (freq: Frequency): Table => {
      const [firstDate, lastDate] = getFirstAndLastDate();

      const datesIntersect = input.map(i => i.getDates())
        .reduce((a, c) => a.filter(i => c.includes(i)));

      let mergedData = new Map();
      datesIntersect.map(date => {
        if (date > firstDate && date < lastDate) {
          let rows = input.map(i => {
            let row = i.getDate(date);
            //Can't fail
            if (row._tag === "Some") {
              return row.value;
            }
          }).flat();
          mergedData.set(date, rows);
        }
      });
      return TableBuilder(mergedData, freq);
    };

    const mergeOnSource = (assets: Array<number>) => {
      let mergedData = new Map();
      assets.forEach((asset, i) => {
        mergedData.set(asset, input[i]);
      });
      return mergedData;
    };

    const getOverlappingDates = (): Option<Array<number>> => {
      let dates: Set<number> | undefined = undefined;
      input.forEach((result) => {
        if (dates === undefined) {
          dates = new Set(result.getDates());
        } else {
          const newSet = new Set(result.getDates());
          dates = new Set([...newSet, ...dates]);
        }
      });
      if (dates === undefined) {
        return none();
      } else {
        return some(Array.from(dates));
      }
    };

    return {
      length,
      _internal: input,
      mergeOnDate,
      mergeOnSource,
      getOverlappingDates,
    }
  }

  export const getPrice = async (ticker: string): Promise<Option<Table>> => {
    const url = `${baseUrl}/eod/${ticker}?api_token=${process.env.EOD_TOKEN}&fmt=json`;
    try {
      const res = await request(url);
      let ret: Map<number, Array<Row>> = new Map(); 
      for (let row of JSON.parse(res)) {
        ret.set(Date.parse(row.date) / 1000, [row]);
      }
      return some(TableBuilder(ret, 0));
    } catch (e) {
      console.log(e);
      return none();
    }
  };

  export const getPrices = async (tickers: Array<string>): Promise<Option<Tables>> => {
    try {
      const requests = await Promise.all(tickers.map(ticker => getPrice(ticker)));

      const values = requests.map(r => {
        if (r._tag === "None") {
          throw Error();
        } else {
          return r.value;
        }
      });
      return some(TablesBuilder(values));
    } catch (e) {
      console.log(e);
      return none();
    }
  };
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
