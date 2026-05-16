"use client";

import Link from "next/link";
import { useState } from "react";

export function AgentClient() {
  const [mode, setMode] = useState<"url" | "text">("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [rawText, setRawText] = useState("");
  const [hint, setHint] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    adapter?: unknown;
    draftTemplateId?: string;
    error?: string;
    raw?: string;
  } | null>(null);

  async function submit() {
    setLoading(true);
    setResult(null);
    try {
      const body: Record<string, unknown> = { hint, saveAsDraft: true };
      if (mode === "url") body.sourceUrl = sourceUrl;
      else body.rawText = rawText;
      const res = await fetch("/api/agent/parse-doc", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setResult({
          error: json.error,
          raw: json.details?.llmRaw,
        });
      } else {
        setResult({
          adapter: json.data.adapter,
          draftTemplateId: json.data.draftTemplateId,
        });
      }
    } catch (e) {
      setResult({ error: (e as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 rounded-lg border p-4">
        <div className="flex gap-2 text-sm">
          <button
            onClick={() => setMode("url")}
            className={`rounded-md px-3 py-1.5 ${
              mode === "url"
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-accent"
            }`}
          >
            文档链接
          </button>
          <button
            onClick={() => setMode("text")}
            className={`rounded-md px-3 py-1.5 ${
              mode === "text"
                ? "bg-primary text-primary-foreground"
                : "border hover:bg-accent"
            }`}
          >
            粘贴文本
          </button>
        </div>

        {mode === "url" ? (
          <input
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://docs.example-relay.com/api/images"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        ) : (
          <textarea
            rows={10}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="粘贴 OpenAPI YAML / Markdown / 接口说明…"
            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
          />
        )}

        <textarea
          rows={2}
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          placeholder="可选：给助手的额外提示，例如「只解析 SD 接口，不要 GPT」"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />

        <button
          onClick={submit}
          disabled={loading || (mode === "url" ? !sourceUrl : !rawText)}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "解析中..." : "开始解析"}
        </button>
      </div>

      <div className="rounded-lg border p-4">
        {!result && (
          <p className="text-sm text-muted-foreground">
            解析结果将显示在这里。成功后会自动创建草稿模板。
          </p>
        )}
        {result?.error && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">解析失败</p>
            <p className="text-xs text-muted-foreground">{result.error}</p>
            {result.raw && (
              <details className="text-xs">
                <summary className="cursor-pointer">LLM 原始输出</summary>
                <pre className="mt-2 max-h-72 overflow-auto rounded-md bg-muted p-2">
                  {result.raw}
                </pre>
              </details>
            )}
          </div>
        )}
        {result?.adapter !== undefined && !result?.error && (
          <div className="space-y-3">
            <p className="text-sm font-medium text-emerald-600">解析成功</p>
            {result.draftTemplateId && (
              <p className="text-xs">
                已保存为草稿模板：
                <Link
                  href={`/admin/templates`}
                  className="font-mono text-primary underline"
                >
                  {result.draftTemplateId}
                </Link>
              </p>
            )}
            <pre className="max-h-[480px] overflow-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(result.adapter, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
