import prisma from "@Root/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextApiRequest, NextApiResponse } from "next";

interface SuggestRequest extends NextApiRequest {
  query: {
    s: string;
  };
}

interface SuggestResponse extends NextApiResponse {
  data: Array<Prisma.api_coverageSelect>;
}

export default async function handler(
  req: SuggestRequest,
  res: SuggestResponse
) {
  if (req.method != "GET") {
    res.status(404);
  }

  try {
    let suggest = await prisma.api_coverage.findMany({
      where: {
        issuer: {
          search: req.query.s.trim().split(" ").join(" & "),
        },
        ticker: {
          search: req.query.s.trim().split(" ").join(" & "),
        },
      },
    });
    return res.status(200).json({ data: suggest });
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
