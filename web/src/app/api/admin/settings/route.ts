import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getAllSettings, setSettings } from "@/lib/services/app-settings";
import { logAudit } from "@/lib/services/audit";

// GET /api/admin/settings — 获取所有设置（敏感字段 mask）
export async function GET() {
  const sess = await getSession();
  if (sess.role !== "admin") {
    return NextResponse.json({ ok: false, error: "权限不足" }, { status: 403 });
  }
  const settings = await getAllSettings();
  return NextResponse.json({ ok: true, data: settings });
}

// PUT /api/admin/settings — 批量更新设置
export async function PUT(req: Request) {
  const sess = await getSession();
  if (sess.role !== "admin") {
    return NextResponse.json({ ok: false, error: "权限不足" }, { status: 403 });
  }

  const body = await req.json();
  // body: { entries: { key: value, ... } }
  if (!body.entries || typeof body.entries !== "object") {
    return NextResponse.json({ ok: false, error: "需要 entries 对象" }, { status: 400 });
  }

  await setSettings(body.entries);

  // 审计
  const keys = Object.keys(body.entries);
  await logAudit({
    userId: sess.userId,
    username: sess.username,
    action: "setting.update",
    target: keys.join(","),
    detail: JSON.stringify(keys.map((k) => ({ key: k, changed: true }))),
    ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
  });

  return NextResponse.json({ ok: true });
}
