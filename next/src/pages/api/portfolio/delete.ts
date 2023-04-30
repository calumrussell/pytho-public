import prisma from "@Root/lib/prisma";
import { withSessionRoute } from "@Root/lib/session";
import type { NextApiRequest, NextApiResponse } from "next";

async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    if (req.method != "DELETE") {
      throw Error("Must be delete method");
    }

    if (!req.session.user) {
      throw Error("User must be authenticated");
    }

    if (
      !req.query.name &&
      !req.query.name != undefined &&
      typeof !req.query.name === "string"
    ) {
      throw Error("Must have name querystring");
    }

    const { name } = req.query;

    const { userKey } = req.session.user;

    await prisma.api_userportfolio.deleteMany({
      where: {
        user_key: userKey,
        name: name?.toString(),
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
