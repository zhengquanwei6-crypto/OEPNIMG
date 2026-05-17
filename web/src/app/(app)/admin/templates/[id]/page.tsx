import Link from "next/link";
import { notFound } from "next/navigation";
import { getTemplate } from "@/lib/services/providers";
import { TemplateEditor } from "./editor-client";

export const dynamic = "force-dynamic";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTemplate(id);
  if (!t) return notFound();
  return (
    <div className="space-y-4">
      <Link
        href="/admin/templates"
        className="text-xs text-muted-foreground hover:underline"
      >
        ← 返回模板列表
      </Link>
      <h1 className="text-2xl font-bold">编辑模板：{t.name}</h1>
      <p className="text-xs text-muted-foreground">
        Key: <code className="font-mono">{t.templateKey}</code> · Version:{" "}
        <code className="font-mono">{t.version}</code> · Status:{" "}
        <code className="font-mono">{t.status}</code>
      </p>
      <TemplateEditor
        id={t.id}
        initial={{
          name: t.name,
          description: t.description ?? "",
          version: t.version,
          status: t.status as "draft" | "published" | "archived",
          configJson: JSON.stringify(t.config, null, 2),
        }}
      />
    </div>
  );
}
