import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const list = await prisma.generation.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      provider: { select: { name: true } },
      model: { select: { displayName: true } },
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">生成历史</h1>
      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">时间</th>
              <th className="p-3">源</th>
              <th className="p-3">模型</th>
              <th className="p-3">提示词</th>
              <th className="p-3">状态</th>
              <th className="p-3">耗时</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted-foreground">
                  暂无记录
                </td>
              </tr>
            ) : (
              list.map((g) => (
                <tr key={g.id} className="border-b last:border-0">
                  <td className="p-3 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(g.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="p-3">{g.provider?.name}</td>
                  <td className="p-3 text-xs">{g.model?.displayName}</td>
                  <td className="p-3 max-w-xs truncate" title={g.prompt}>
                    {g.prompt}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="p-3 text-xs">{g.durationMs ? `${g.durationMs} ms` : "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "succeeded"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed"
        ? "bg-destructive/10 text-destructive"
        : "bg-amber-100 text-amber-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{status}</span>
  );
}
