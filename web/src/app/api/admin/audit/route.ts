import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { queryAuditLogs } from "@/lib/services/audit";

// GET /api/admin/audit?page=1&pageSize=50&action=xxx
export async function GET(req: Request) {
  const sess = await getSession();
  if (sess.role !== "admin") {
    return NextResponse.json({ ok: false, error: "权限不足" }, { status: 403 });
  }

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page")) || 1;
  const pageSize = Number(url.searchParams.get("pageSize")) || 50;
  const action = url.searchParams.get("action") ?? undefined;
  const userId = url.searchParams.get("userId") ?? undefined;

  const result = await queryAuditLogs({ page, pageSize, action, userId });
  return NextResponse.json({ ok: true, data: result });
}
