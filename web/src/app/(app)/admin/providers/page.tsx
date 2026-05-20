import Link from "next/link";
import { listProviders, listTemplates } from "@/lib/services/providers";
import { ProvidersClient } from "./providers-client";

export const dynamic = "force-dynamic";

export default async function ProvidersPage() {
  const [providers, templates] = await Promise.all([
    listProviders(),
    listTemplates(),
  ]);
  const usable = templates.filter((t) => t.status === "published" || t.status === "draft");
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API 源</h1>
        <Link
          href="/admin/agent"
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          通过文档自动生成
        </Link>
      </div>
      <ProvidersClient providers={providers} templates={usable} />
    </div>
  );
}
