import { SettingsClient } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">系统设置</h1>
      <p className="text-sm text-muted-foreground mb-6">修改后立即生效，无需重启容器或修改 .env 文件。</p>
      <SettingsClient />
    </div>
  );
}
