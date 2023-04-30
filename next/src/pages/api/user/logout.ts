import { NextApiRequest, NextApiResponse } from "next";

import prisma from "@Root/lib/prisma";
import { withSessionRoute } from "@Root/lib/session";

export default withSessionRoute(logoutRoute);

interface LogoutRequest extends NextApiRequest {}

interface LogoutResponse extends NextApiResponse {}

async function logoutRoute(req: LogoutRequest, res: LogoutResponse) {
  if (req.method != "GET") {
    res.status(404);
  }

  try {
    req.session.destroy();
    return res.send({ ok: true });
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
