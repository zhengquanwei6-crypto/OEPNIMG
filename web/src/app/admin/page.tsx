import { prisma } from "@/lib/db";

export default async function AdminHome() {
  const [providers, templates, generations] = await Promise.all([
    prisma.provider.count(),
    prisma.adapterTemplate.count(),
    prisma.generation.count(),
  ]);
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">概览</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="API 源" value={providers} />
        <Stat label="适配器模板" value={templates} />
        <Stat label="历史生成" value={generations} />
      </div>
      <p className="text-sm text-muted-foreground">
        从左侧菜单进入对应模块。建议第一步：去 <b>LLM 助手</b> 上传一份中转站文档，
        让它自动生成适配器；再到 <b>API 源</b> 填入 API Key 即可启用。
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
