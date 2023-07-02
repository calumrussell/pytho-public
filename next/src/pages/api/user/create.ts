import prisma from "@Root/lib/prisma";
import { withSessionRoute } from "@Root/lib/session";
import { NextApiRequest, NextApiResponse } from "next";

export default withSessionRoute(createRoute);

async function createRoute(req: NextApiRequest, res: NextApiResponse) {
  if (req.method != "GET") {
    res.status(404);
  }

  try {
    const user = await prisma.api_user.create({ data: {} });
    req.session.user = {
      userKey: user.user_key,
    };

    await req.session.save();
    return res.json({ ok: true });
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
