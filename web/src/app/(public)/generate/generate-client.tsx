"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

interface ProviderItem {
  id: string;
  name: string;
  models: { id: string; modelKey: string; displayName: string; capability: string }[];
}

export function GenerateClient({ providers }: { providers: ProviderItem[] }) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const provider = providers.find((p) => p.id === providerId);
  const models = useMemo(
    () => provider?.models.filter((m) => m.capability === "text-to-image") ?? [],
    [provider],
  );
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  if (providers.length === 0) {
    return (
      <div className="rounded-md border p-6 text-sm">
        还没有配置 API 源。请前往{" "}
        <Link href="/admin" className="font-medium underline">
          后台
        </Link>{" "}
        添加一个中转站，或使用 LLM 助手通过文档自动生成。
      </div>
    );
  }

  async function submit() {
    setLoading(true);
    setError(null);
    setImages([]);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerId, modelId, prompt, size, count }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "生成失败");
      if (json.data.status !== "succeeded")
        throw new Error(json.data.errorMessage ?? "生成失败");
      setImages(json.data.imageUrls);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-[360px_1fr]">
      <div className="space-y-4 rounded-lg border p-4">
        <Field label="API 源">
          <select
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
              const p = providers.find((p) => p.id === e.target.value);
              setModelId(p?.models[0]?.id ?? "");
            }}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {providers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="模型">
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName}
              </option>
            ))}
          </select>
        </Field>
        <Field label="提示词">
          <textarea
            rows={5}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例：a cyberpunk cat in neon Tokyo street, ultra-detailed"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="尺寸">
            <select
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              {["1024x1024", "1024x1792", "1792x1024", "512x512", "768x768"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ),
              )}
            </select>
          </Field>
          <Field label="数量">
            <input
              type="number"
              min={1}
              max={4}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(4, Number(e.target.value))))}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            />
          </Field>
        </div>
        <button
          onClick={submit}
          disabled={loading || !prompt.trim() || !modelId}
          className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {loading ? "生成中..." : "生成"}
        </button>
        {error && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-4">
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">结果将显示在这里</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt="生成结果"
                className="aspect-square w-full rounded-md border object-cover"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
