import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Edge Middleware — 轻量级路由级保护
 *
 * 注意：这里不做完整的 session 验证（iron-session 在 Edge 有限制），
 * 只做基本的 cookie 存在性检查。真正的鉴权在每个 route handler 里通过 getSession() 执行。
 *
 * 但这能阻止：
 * 1. 完全没 cookie 的探测请求（扫描器）
 * 2. 登录页的 redirect 逻辑
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 保护 /api/admin/* 路由
  if (pathname.startsWith("/api/admin")) {
    const sessionCookie = request.cookies.get("oepnimg_sess");
    if (!sessionCookie?.value) {
      return NextResponse.json(
        { ok: false, error: "未登录" },
        { status: 401 }
      );
    }
  }

  // 保护 /admin/* 页面（非 API）
  if (pathname.startsWith("/admin") && !pathname.startsWith("/api")) {
    const sessionCookie = request.cookies.get("oepnimg_sess");
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 保护所有 admin API 和 admin 页面
    "/api/admin/:path*",
    "/admin/:path*",
  ],
};
