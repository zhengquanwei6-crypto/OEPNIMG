import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";
import bcrypt from "bcryptjs";

// PUT /api/admin/password — 修改当前管理员密码
export async function PUT(req: Request) {
  const sess = await getSession();
  if (sess.role !== "admin" || !sess.userId) {
    return NextResponse.json({ ok: false, error: "权限不足" }, { status: 403 });
  }

  const body = await req.json();
  const { newPassword } = body;

  if (!newPassword || typeof newPassword !== "string" || newPassword.length < 4) {
    return NextResponse.json({ ok: false, error: "密码至少 4 个字符" }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.user.update({
    where: { id: sess.userId },
    data: { passwordHash: hash },
  });

  await logAudit({
    userId: sess.userId,
    username: sess.username,
    action: "password.change",
    target: `user:${sess.userId}`,
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
  });

  return NextResponse.json({ ok: true });
}
