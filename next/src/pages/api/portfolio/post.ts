import prisma from "@Root/lib/prisma";
import { withSessionRoute } from "@Root/lib/session";
import type { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method != "POST") {
      throw Error("Must be delete method");
    }

    if (!req.session.user) {
      throw Error("User must be authenticated");
    }

    if (!req.body.portfolio && !req.body.name) {
      throw Error("Missing portfolio or name in body");
    }

    const { name, portfolio } = req.body;

    const { userKey } = req.session.user;

    await prisma.api_userportfolio.upsert({
      where: {
        name_user_key: {
          user_key: userKey,
          name: name,
        },
      },
      update: {
        portfolio: portfolio,
      },
      create: {
        user_key: userKey,
        portfolio: portfolio,
        name: name,
      },
    });
    return res.status(200).json({ ok: true });
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

export default withSessionRoute(handler);
