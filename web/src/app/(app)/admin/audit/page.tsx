import { AuditClient } from "./audit-client";

export const dynamic = "force-dynamic";

export default function AuditPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-1">审计日志</h1>
      <p className="text-sm text-muted-foreground mb-6">所有管理操作的记录。</p>
      <AuditClient />
    </div>
  );
}
