import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ok, fail, handleError } from "@/lib/api";
import { assertLimit, clientKey } from "@/lib/rate-limit";
import { logAudit } from "@/lib/services/audit";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    // Rate limit: 5 attempts per IP per 15 minutes
    const ip = clientKey(req);
    assertLimit({ scope: "login", key: ip, max: 5, windowMs: 15 * 60_000 });

    const data = Body.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { username: data.username } });

    if (!user) {
      await logAudit({
        action: "login.failed",
        detail: JSON.stringify({ username: data.username, reason: "user_not_found" }),
        ip: ip.replace("ip:", ""),
      });
      return fail(401, "用户名或密码错误");
    }

    const okPwd = await bcrypt.compare(data.password, user.passwordHash);
    if (!okPwd) {
      await logAudit({
        userId: user.id,
        username: user.username,
        action: "login.failed",
        detail: JSON.stringify({ reason: "wrong_password" }),
        ip: ip.replace("ip:", ""),
      });
      return fail(401, "用户名或密码错误");
    }

    const sess = await getSession();
    sess.userId = user.id;
    sess.username = user.username;
    sess.role = user.role as "admin" | "user";
    await sess.save();

    await logAudit({
      userId: user.id,
      username: user.username,
      action: "login.success",
      ip: ip.replace("ip:", ""),
    });

    return ok({ username: user.username, role: user.role });
  } catch (e) {
    return handleError(e);
  }
}
