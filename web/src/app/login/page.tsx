import { Suspense } from "react";
import { LoginClient } from "./login-client";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">OEPNIMG · 登录</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理员后台</p>
        </div>
        <Suspense fallback={<div className="rounded-lg border p-6 text-sm text-muted-foreground">加载中...</div>}>
          <LoginClient />
        </Suspense>
      </div>
    </main>
  );
}
