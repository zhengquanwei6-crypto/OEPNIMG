import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { db } from "@/lib/db";
import { logAudit } from "@/lib/services/audit";

// PUT /api/admin/users — 修改当前管理员用户名
export async function PUT(req: Request) {
  const sess = await getSession();
  if (sess.role !== "admin" || !sess.userId) {
    return NextResponse.json({ ok: false, error: "权限不足" }, { status: 403 });
  }

  const body = await req.json();
  const { newUsername } = body;

  if (!newUsername || typeof newUsername !== "string" || newUsername.trim().length < 2) {
    return NextResponse.json({ ok: false, error: "用户名至少 2 个字符" }, { status: 400 });
  }

  // Check uniqueness
  const existing = await db.user.findUnique({ where: { username: newUsername.trim() } });
  if (existing && existing.id !== sess.userId) {
    return NextResponse.json({ ok: false, error: "用户名已存在" }, { status: 409 });
  }

  const oldUsername = sess.username;
  await db.user.update({
    where: { id: sess.userId },
    data: { username: newUsername.trim() },
  });

  await logAudit({
    userId: sess.userId,
    username: newUsername.trim(),
    action: "username.change",
    target: `user:${sess.userId}`,
    detail: JSON.stringify({ from: oldUsername, to: newUsername.trim() }),
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
  });

  return NextResponse.json({ ok: true });
}

// GET /api/admin/users — 列出所有用户（admin）
export async function GET() {
  const sess = await getSession();
  if (sess.role !== "admin") {
    return NextResponse.json({ ok: false, error: "权限不足" }, { status: 403 });
  }

  const users = await db.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true, updatedAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ ok: true, data: users });
}
