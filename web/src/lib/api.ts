/**
 * API Route 工具：统一错误处理 / 响应封装
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { HttpError } from "@/lib/session";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(status: number, message: string, extra?: unknown) {
  return NextResponse.json(
    { ok: false, error: message, ...(extra ? { details: extra } : {}) },
    { status },
  );
}

export function handleError(e: unknown) {
  if (e instanceof HttpError) return fail(e.status, e.message);
  if (e instanceof ZodError) {
    return fail(
      400,
      "参数校验失败",
      e.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    );
  }
  const msg = (e as Error)?.message ?? "未知错误";
  console.error("[api]", e);
  return fail(500, msg);
}
