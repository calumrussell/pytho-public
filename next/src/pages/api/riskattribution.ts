import { EodSource } from "@Common/index";
import type { NextApiRequest, NextApiResponse } from "next";
import { risk } from "@Root/lib/panacea/pkg";
import prisma from "@Root/lib/prisma";

interface RiskAttributionRequest extends NextApiRequest {
  query: {
    ind: Array<string>;
    dep: string;
  };
}

interface RiskAttributionResponse extends NextApiResponse {
  data: {
    dep: number;
    ind: Array<number>;
    min_date: number;
    max_data: number;
    core: {
      regression: {
        coefs: Array<number>;
        errors: Array<number>;
      };
      avgs: Array<number>;
      rolling: {
        regressions: {
          coefs: Array<Array<number>>;
          errors: Array<Array<number>>;
          dates: Array<number>;
        };
      };
    };
  };
}

interface RiskInput {
  dep: number;
  ind: Array<number>;
  data: Array<Array<EodSource.Row>>;
}

export default async function handler(
  req: RiskAttributionRequest,
  res: RiskAttributionResponse
) {
  if (req.method != "GET") {
    res.status(404);
  }

  const { ind, dep } = req.query;

  try {
    let wrapper: Array<string> = [];
    //Need to coerce single value into array
    if (typeof ind === "string") {
      wrapper.push(ind);
    } else {
      wrapper = ind;
    }

    const assetsToNumber = [dep, ...wrapper].map((v) => Number(v));

    const assetIssuers = await prisma.api_coverage.findMany({
      where: {
        id: {
          in: assetsToNumber,
        },
      },
    });

    if (assetIssuers.length === 0) {
      throw Error("Missing Issuer");
    }

    //Horrible time complexity but fine in this instance
    const orderedAssetsIssuers = assetsToNumber.map(num => assetIssuers.find(issuer => issuer.id === num));
    const assetTickers = orderedAssetsIssuers.map((issuer) =>
      issuer ? issuer.ticker ? issuer.ticker : "" : ""
    );
    const data = await EodSource.getPricesFlat(assetTickers);
    if (data._tag === "None") {
      throw Error("Missing data for issuer");
    }

    //TODO: this has to be changed when we can add more independent
    if (data.value.length != [dep, ...wrapper].length) {
      throw Error("Missing data");
    }

    let input: RiskInput = {
      dep: Number(dep),
      ind: wrapper.map((v) => Number(v)),
      data: data.value,
    };

    let result = risk(input);
    return res.status(200).send({ data: result });
  } catch (e: unknown) {
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
