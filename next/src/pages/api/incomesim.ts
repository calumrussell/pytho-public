import { NextApiRequest, NextApiResponse } from "next";

import { EodSource } from "@Common/index";
import prisma from "@Root/lib/prisma";

import { antevorta } from "../../../lib/panacea/pkg";

//https://docs.rs/getrandom/latest/getrandom/#nodejs-es-module-support
import { webcrypto } from "node:crypto";
globalThis.crypto = webcrypto;

interface IncomeSimRequest extends NextApiRequest {
  body: {
    assets: Array<number>;
    weights: Array<number>;
    sim_length: number;
    runs: number;
    sim_config: string;
    inflation_mu: number;
    inflation_var: number;
    start_date: number;
  };
}

interface AntevortaInput {
  assets: Array<string>;
  close: Array<Array<EodSource.Row>>;
  weights: Map<string, number>;
  sim_length: number;
  runs: number;
  config: string;
  inflation_mu: number;
  inflation_var: number;
  //This is created on the server if the user doesn't pass a date
  start_date: number;
}

interface IncomeSimResult {
  cash: Array<number>;
  gross_income: Array<number>;
  net_income: Array<number>;
  expense: Array<number>;
  tax_paid: Array<number>;
  sipp_contributions: Array<number>;
  ret: number;
  cagr: number;
  vol: number;
  mdd: number;
  sharpe: number;
  values: Array<number>;
  returns: Array<number>;
  returns_dates: Array<number>;
  investment_cash_flows: Array<number>;
  first_date: number;
  last_date: number;
  dd_start_date: number;
  dd_end_date: number;
  best_return: number;
  worst_return: number;
  frequency: string;
}

interface IncomeSimResponse extends NextApiResponse {
  sample_start: number;
  sample_end: number;
  results: Array<IncomeSimResult>;
}

export default async function handler(
  req: IncomeSimRequest,
  res: IncomeSimResponse
) {
  if (req.method != "POST") {
    res.status(404);
  }

  const {
    weights,
    assets,
    sim_length,
    runs,
    sim_config,
    inflation_mu,
    inflation_var,
    start_date,
  } = req.body;

  try {
    let assetIssuers = await prisma.api_coverage.findMany({
      where: {
        id: {
          in: assets,
        },
      },
    });

    if (assetIssuers.length === 0) {
      throw Error("Missing Issuer");
    }

    const assetTickers = assetIssuers.map((issuer) =>
      issuer.ticker ? issuer.ticker : ""
    );
    const assetData = await EodSource.getPricesFlat(assetTickers);
    if (assetData._tag === "None") {
      throw Error("Missing data for issuer");
    }

    let mappedWeights = new Map();
    weights.forEach((weight, i) => {
      mappedWeights.set(assets[i].toString(), Number(weight));
    });

    const input: AntevortaInput = {
      assets: assets.map((a) => a.toString()),
      weights: mappedWeights,
      close: assetData.value,
      sim_length,
      runs,
      config: sim_config,
      inflation_mu,
      inflation_var,
      start_date,
    };
    return res.send({ data: antevorta(input) });
  } catch (e) {
    console.log(e);
    if (e instanceof Error) {
      const err = {
        message: e.message,
        error: e.name,
      };
      return res.status(400).send({ statusCode: 400, ...err });
    }
    return res.status(500).send({ ok: false });
  }
}
