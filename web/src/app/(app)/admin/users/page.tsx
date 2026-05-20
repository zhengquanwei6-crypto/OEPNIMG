import { UsersClient } from "./users-client";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">用户管理</h1>
      <p className="text-sm text-muted-foreground mb-6">修改用户名、密码，管理登录会话。</p>
      <UsersClient />
    </div>
  );
}
