import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { GenerationDetailClient } from "./detail-client";

export const dynamic = "force-dynamic";

export default async function GenerationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const g = await prisma.generation.findUnique({
    where: { id },
    include: {
      provider: { select: { name: true, slug: true } },
      model: { select: { displayName: true, modelKey: true } },
    },
  });
  if (!g) return notFound();

  const imageUrls: string[] = (() => {
    try {
      const v = JSON.parse(g.resultUrlsJson);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/history"
          className="text-xs text-muted-foreground hover:underline"
        >
          ← 返回历史
        </Link>
      </div>
      <h1 className="text-2xl font-bold">生成详情</h1>

      <GenerationDetailClient
        id={g.id}
        favorite={g.favorite}
        status={g.status}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Info label="时间" value={new Date(g.createdAt).toLocaleString("zh-CN")} />
        <Info label="完成时间" value={g.finishedAt ? new Date(g.finishedAt).toLocaleString("zh-CN") : "—"} />
        <Info label="API 源" value={g.provider?.name ?? "—"} />
        <Info label="模型" value={`${g.model?.displayName ?? "—"} (${g.model?.modelKey ?? ""})`} />
        <Info label="尺寸" value={g.size ?? "—"} />
        <Info label="数量" value={String(g.count)} />
        <Info label="种子" value={g.seed != null ? String(g.seed) : "—"} />
        <Info label="耗时" value={g.durationMs ? `${g.durationMs} ms` : "—"} />
      </div>

      <div>
        <h2 className="mb-2 text-sm font-medium">提示词</h2>
        <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
          {g.prompt}
        </pre>
        {g.negativePrompt && (
          <>
            <h2 className="mb-2 mt-3 text-sm font-medium">反向提示词</h2>
            <pre className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
              {g.negativePrompt}
            </pre>
          </>
        )}
      </div>

      {g.errorMessage && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-destructive">错误信息</h2>
          <pre className="whitespace-pre-wrap rounded-md border border-destructive/50 bg-destructive/10 p-3 text-xs">
            {g.errorMessage}
          </pre>
        </div>
      )}

      {imageUrls.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium">结果图</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {imageUrls.map((url, i) => (
              <a key={url} href={url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={`result ${i + 1}`}
                  className="aspect-square w-full rounded-md border object-cover"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {(g.lastRequestJson || g.lastResponseJson) && (
        <details className="rounded-lg border p-3">
          <summary className="cursor-pointer text-sm font-medium">
            调试快照（请求 / 响应）
          </summary>
          <div className="mt-3 space-y-3">
            {g.lastRequestJson && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">请求</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">
                  {pretty(g.lastRequestJson)}
                </pre>
              </div>
            )}
            {g.lastResponseJson && (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">响应</p>
                <pre className="max-h-64 overflow-auto rounded-md bg-muted p-2 text-xs">
                  {pretty(g.lastResponseJson)}
                </pre>
              </div>
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm">{value}</p>
    </div>
  );
}

function pretty(s: string): string {
  try {
    return JSON.stringify(JSON.parse(s), null, 2);
  } catch {
    return s;
  }
}
