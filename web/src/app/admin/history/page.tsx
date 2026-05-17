import Link from "next/link";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ favorite?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const where: Prisma.GenerationWhereInput = { hidden: false };
  if (sp.favorite === "1") where.favorite = true;
  if (sp.status) where.status = sp.status;

  const list = await prisma.generation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      provider: { select: { name: true } },
      model: { select: { displayName: true } },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">生成历史</h1>
        <div className="flex gap-1 text-xs">
          <FilterLink href="/admin/history" active={!sp.favorite && !sp.status}>
            全部
          </FilterLink>
          <FilterLink
            href="/admin/history?favorite=1"
            active={sp.favorite === "1"}
          >
            收藏
          </FilterLink>
          <FilterLink
            href="/admin/history?status=succeeded"
            active={sp.status === "succeeded"}
          >
            成功
          </FilterLink>
          <FilterLink
            href="/admin/history?status=failed"
            active={sp.status === "failed"}
          >
            失败
          </FilterLink>
        </div>
      </div>
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
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-muted-foreground">
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
                    {g.favorite ? "★ " : ""}
                    {g.prompt}
                  </td>
                  <td className="p-3">
                    <StatusBadge status={g.status} />
                  </td>
                  <td className="p-3 text-xs">
                    {g.durationMs ? `${g.durationMs} ms` : "—"}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/history/${g.id}`}
                      className="text-xs text-primary underline"
                    >
                      详情
                    </Link>
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

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "succeeded"
      ? "bg-emerald-100 text-emerald-700"
      : status === "failed"
        ? "bg-destructive/10 text-destructive"
        : status === "canceled"
          ? "bg-muted text-muted-foreground"
          : "bg-amber-100 text-amber-700";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{status}</span>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md border px-2 py-1 ${
        active ? "bg-primary text-primary-foreground" : "hover:bg-accent"
      }`}
    >
      {children}
    </Link>
  );
}
