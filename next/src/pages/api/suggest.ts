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
    /*
      This is code for prisma default full text search included for if there is a problem with raw query.
      In practice, the prisma code was extremely slow so have switched to raw query.
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

      Another example that was also slow
      let suggest =
        await prisma.$queryRaw`select * from api_coverage where to_tsvector('english', name) @@ plainto_tsquery('english', ${req.query.s}) or to_tsvector('english', ticker) @@ plainto_tsquery('english', ${req.query.s});`;
    */

    let suggest =
      await prisma.$queryRaw`select *, word_similarity(${req.query.s}, name) as sml from api_coverage where ${req.query.s} <% name union select *, word_similarity(${req.query.s}, ticker) as sml from api_coverage where ${req.query.s} <% ticker order by sml desc, ticker;`;

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
