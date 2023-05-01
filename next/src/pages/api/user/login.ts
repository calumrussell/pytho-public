import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@Root/lib/prisma";
import { withSessionRoute } from "@Root/lib/session";

export default withSessionRoute(loginRoute);

interface LoginRequest extends NextApiRequest {
  body: {
    userKey: string;
  };
}

interface LoginResponse extends NextApiResponse {}

async function loginRoute(req: LoginRequest, res: LoginResponse) {
  if (req.method != "POST") {
    res.status(404);
  }

  try {
    let user = await prisma.api_user.findFirst({
      where: {
        user_key: {
          equals: req.body.userKey,
        },
      },
    });

    if (user === undefined || user === null) {
      res.status(404);
    } else {
      req.session.user = {
        userKey: user.user_key,
      };

      await req.session.save();
      return res.json({ ok: true });
    }
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
