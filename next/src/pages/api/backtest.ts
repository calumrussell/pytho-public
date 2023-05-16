import type { NextApiRequest, NextApiResponse } from "next";

import { EodSource } from "@Common/index";
import prisma from "@Root/lib/prisma";
import { backtest } from "@Root/lib/panacea/pkg";

interface BacktestRequest extends NextApiRequest {
  body: {
    assets: Array<number>;
    weights: Array<number>;
  };
}

interface BacktestResponse extends NextApiResponse {
  ret: number;
  cagr: number;
  mdd: number;
  vol: number;
  sharpe: number;
  values: Array<number>;
  returns: Array<number>;
  dates: Array<number>;
}

interface AlatorInput {
  assets: Array<string>;
  weights: Map<string, number>;
  data: Array<Array<EodSource.Row>>;
}

export default async function handler(
  req: BacktestRequest,
  res: BacktestResponse
) {
  if (req.method != "POST") {
    res.status(404);
  }

  const { weights, assets } = req.body;

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

    const alatorInput: AlatorInput = {
      assets: assets.map((v) => v.toString()),
      weights: mappedWeights,
      data: assetData.value,
    };

    const result = backtest(alatorInput);
    //Need to size up decimals
    const formattedResult = {
      ...result,
      cagr: result.cagr * 100,
      vol: result.vol * 100,
      mdd: result.mdd * 100,
      ret: result.ret * 100,
    };
    return res.status(200).json({ data: formattedResult });
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
