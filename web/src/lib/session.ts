/**
 * 基于 iron-session 的轻量会话
 *   - cookie 名: oepnimg_sess
 *   - 仅保存 userId / role
 */
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  username?: string;
  role?: "admin" | "user";
}

const SESSION_COOKIE = "oepnimg_sess";

function getOptions(): SessionOptions {
  const password = process.env.SESSION_SECRET ?? "";
  if (!password || password.length < 32) {
    throw new Error("SESSION_SECRET 必须配置且长度 ≥ 32 字符");
  }
  // 默认生产环境用 secure cookie（仅 HTTPS）；
  // 如果通过纯 HTTP 部署（如 IP 直连），可设置 COOKIE_SECURE=false
  const secure =
    process.env.COOKIE_SECURE !== undefined
      ? process.env.COOKIE_SECURE === "true"
      : process.env.NODE_ENV === "production";
  return {
    password,
    cookieName: SESSION_COOKIE,
    cookieOptions: {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7d
    },
  };
}

export async function getSession() {
  return getIronSession<SessionData>(cookies(), getOptions());
}

export async function requireAdmin(): Promise<SessionData> {
  const sess = await getSession();
  if (!sess.userId || sess.role !== "admin") {
    throw new HttpError(401, "需要管理员登录");
  }
  return sess;
}

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
