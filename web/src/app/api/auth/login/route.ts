import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { ok, fail, handleError } from "@/lib/api";

const Body = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const data = Body.parse(await req.json());
    const user = await prisma.user.findUnique({ where: { username: data.username } });
    if (!user) return fail(401, "用户名或密码错误");
    const okPwd = await bcrypt.compare(data.password, user.passwordHash);
    if (!okPwd) return fail(401, "用户名或密码错误");

    const sess = await getSession();
    sess.userId = user.id;
    sess.username = user.username;
    sess.role = user.role as "admin" | "user";
    await sess.save();
    return ok({ username: user.username, role: user.role });
  } catch (e) {
    return handleError(e);
  }
}
