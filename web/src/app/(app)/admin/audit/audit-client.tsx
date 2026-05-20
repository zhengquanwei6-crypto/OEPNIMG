"use client";

import * as React from "react";
import { Shield, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";

interface AuditItem {
  id: string;
  userId: string | null;
  username: string | null;
  action: string;
  target: string | null;
  detail: string | null;
  ip: string | null;
  createdAt: string;
}

export function AuditClient() {
  const [items, setItems] = React.useState<AuditItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(true);

  const fetchPage = React.useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/admin/audit?page=${p}&pageSize=30`);
    const json = await res.json();
    if (json.ok) {
      setItems(json.data.items);
      setTotalPages(json.data.totalPages);
      setPage(json.data.page);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchPage(1); }, [fetchPage]);

  if (!loading && items.length === 0) {
    return <EmptyState icon={<Shield className="h-10 w-10" />} title="暂无审计记录" description="管理操作将自动记录在此" />;
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-2 text-left font-medium">时间</th>
              <th className="px-4 py-2 text-left font-medium">用户</th>
              <th className="px-4 py-2 text-left font-medium">操作</th>
              <th className="px-4 py-2 text-left font-medium">目标</th>
              <th className="px-4 py-2 text-left font-medium">IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b"><td colSpan={5} className="px-4 py-3"><div className="h-4 w-full rounded bg-muted animate-pulse" /></td></tr>
              ))
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-b hover:bg-muted/30">
                  <td className="px-4 py-2 whitespace-nowrap text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-4 py-2">{item.username ?? "—"}</td>
                  <td className="px-4 py-2">
                    <Badge variant="outline" className="text-xs">{item.action}</Badge>
                  </td>
                  <td className="px-4 py-2 max-w-[200px] truncate text-xs">{item.target ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{item.ip ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => fetchPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => fetchPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
