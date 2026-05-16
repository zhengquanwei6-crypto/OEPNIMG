import { listTemplates } from "@/lib/services/providers";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const list = await listTemplates();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">适配器模板</h1>
      <p className="text-sm text-muted-foreground">
        每条记录代表一份「调用规则」，由 LLM 助手生成或手工编辑。同一中转站可保留多个版本。
      </p>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">名称</th>
              <th className="p-3">Key</th>
              <th className="p-3">版本</th>
              <th className="p-3">状态</th>
              <th className="p-3">最近干跑</th>
              <th className="p-3">更新时间</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  暂无模板
                </td>
              </tr>
            ) : (
              list.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.templateKey}</td>
                  <td className="p-3 font-mono text-xs">{t.version}</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        t.status === "published"
                          ? "bg-emerald-100 text-emerald-700"
                          : t.status === "draft"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="p-3 text-xs">
                    {t.lastDryRunOk == null ? "—" : t.lastDryRunOk ? "通过" : "失败"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleString("zh-CN")}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
