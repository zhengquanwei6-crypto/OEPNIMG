"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";

interface ProviderItem {
  id: string;
  name: string;
  models: {
    id: string;
    modelKey: string;
    displayName: string;
    capability: string;
  }[];
}

type Capability = "text-to-image" | "image-to-image" | "upscale" | "inpaint";

export function GenerateClient({ providers }: { providers: ProviderItem[] }) {
  const [providerId, setProviderId] = useState(providers[0]?.id ?? "");
  const provider = providers.find((p) => p.id === providerId);
  const [capability, setCapability] = useState<Capability>("text-to-image");

  const models = useMemo(
    () => provider?.models.filter((m) => m.capability === capability) ?? [],
    [provider, capability],
  );
  const [modelId, setModelId] = useState(models[0]?.id ?? "");
  // capability/provider 切换时重置 modelId
  const lastKey = useRef<string>("");
  const key = `${providerId}::${capability}`;
  if (key !== lastKey.current) {
    lastKey.current = key;
    if (models[0] && models[0].id !== modelId) {
      // setState in render is ok if conditional & guarded —— 用 queueMicrotask 避免警告
      queueMicrotask(() => setModelId(models[0].id));
    }
  }

  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [size, setSize] = useState("1024x1024");
  const [count, setCount] = useState(1);
  const [imageUrl, setImageUrl] = useState("");
  const [maskUrl, setMaskUrl] = useState("");
  // 业务自定义参数（透传给 Adapter 的 extra）
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("1K");
  const [outputFormat, setOutputFormat] = useState<"png" | "jpg" | "jpeg">("png");

  const [progress, setProgress] = useState<number>(0);
  const [phase, setPhase] = useState<string>("");
  const [taskId, setTaskId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  // 提供商支持的能力列表（必须在任何 early return 之前调用 hooks）
  const supportedCaps = useMemo(() => {
    const set = new Set<Capability>();
    for (const m of provider?.models ?? []) set.add(m.capability as Capability);
    return Array.from(set);
  }, [provider]);

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
    setProgress(0);
    setPhase("提交中");
    setTaskId("");

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/generate/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          providerId,
          modelId,
          prompt,
          negativePrompt: negativePrompt || undefined,
          size,
          count,
          imageUrl: imageUrl || undefined,
          maskUrl: maskUrl || undefined,
          extra: {
            aspectRatio,
            resolution,
            outputFormat,
          },
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // SSE 事件以空行分隔
        const events = buffer.split("\n\n");
        buffer = events.pop() ?? "";
        for (const block of events) {
          const lines = block.split("\n");
          let evt = "message";
          let data = "";
          for (const ln of lines) {
            if (ln.startsWith("event: ")) evt = ln.slice(7).trim();
            else if (ln.startsWith("data: ")) data += ln.slice(6);
          }
          if (!data) continue;
          try {
            const payload = JSON.parse(data);
            if (evt === "queued") setPhase("已排队");
            else if (evt === "running") {
              setPhase("生成中");
              if (payload.id) setTaskId(payload.id);
            } else if (evt === "progress") setProgress(payload.progress ?? 0);
            else if (evt === "succeeded") {
              setProgress(100);
              setPhase("完成");
              setImages(payload.imageUrls ?? []);
            } else if (evt === "failed") {
              throw new Error(payload.error ?? "生成失败");
            } else if (evt === "canceled") {
              setPhase("已取消");
            }
          } catch (e) {
            if ((e as Error).name === "AbortError") return;
            throw e;
          }
        }
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setPhase("已取消");
      } else {
        setError((e as Error).message);
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function cancel() {
    abortRef.current?.abort();
    if (taskId) {
      await fetch(`/api/generations/${taskId}/cancel`, { method: "POST" }).catch(
        () => {},
      );
    }
  }

  function download(url: string, idx: number) {
    const a = document.createElement("a");
    a.href = url;
    a.download = `oepnimg-${taskId || Date.now()}-${idx + 1}.png`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function favorite() {
    if (!taskId) return;
    await fetch(`/api/generations/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorite: true }),
    }).catch(() => {});
  }

  const needImageInput = capability === "image-to-image" || capability === "inpaint" || capability === "upscale";
  const needMask = capability === "inpaint";

  // 当前所选模型的 modelKey（用来判断显示哪些参数）
  const currentModel = models.find((m) => m.id === modelId);
  const modelKey = currentModel?.modelKey ?? "";
  // GPT Image 2：使用 aspectRatio + resolution，不要 size
  const useGptImage2Style = modelKey.startsWith("gpt-image-2");
  // 1:1 不能 4K（kie.ai 限制）；auto 只能 1K
  const resolution4kBlocked = useGptImage2Style && aspectRatio === "1:1";
  const resolutionAutoBlocked = useGptImage2Style && aspectRatio === "auto";

  return (
    <div className="grid gap-6 md:grid-cols-[360px_1fr]">
      <div className="space-y-3 rounded-lg border p-4">
        <Field label="API 源">
          <select
            value={providerId}
            onChange={(e) => {
              setProviderId(e.target.value);
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
        <Field label="能力">
          <div className="flex flex-wrap gap-1">
            {(["text-to-image", "image-to-image", "upscale", "inpaint"] as Capability[]).map((c) => {
              const enabled = supportedCaps.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  disabled={!enabled}
                  onClick={() => setCapability(c)}
                  className={`rounded-md border px-2 py-1 text-xs ${
                    capability === c
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  } disabled:opacity-30`}
                >
                  {capabilityLabel(c)}
                </button>
              );
            })}
          </div>
        </Field>
        <Field label="模型">
          <select
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            {models.length === 0 ? (
              <option value="">该能力无可用模型</option>
            ) : (
              models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))
            )}
          </select>
        </Field>
        {needImageInput && (
          <Field label={needMask ? "原图 URL" : "输入图 URL"} required>
            <input
              required
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono"
            />
          </Field>
        )}
        {needMask && (
          <Field label="蒙版 URL">
            <input
              value={maskUrl}
              onChange={(e) => setMaskUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-md border bg-background px-3 py-2 text-xs font-mono"
            />
          </Field>
        )}
        <Field label="提示词" required>
          <textarea
            rows={4}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="例：a cyberpunk cat in neon Tokyo street, ultra-detailed"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="反向提示词（可选）">
          <textarea
            rows={2}
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            placeholder="blurry, low-quality, deformed"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          {useGptImage2Style ? (
            <Field label="长宽比">
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {["auto", "1:1", "9:16", "16:9", "4:3", "3:4"].map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </Field>
          ) : (
            <Field label="尺寸">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                {[
                  "1024x1024",
                  "1024x1792",
                  "1792x1024",
                  "512x512",
                  "768x768",
                  "1280x720",
                ].map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {useGptImage2Style ? (
            <Field label="分辨率">
              <div className="flex gap-1">
                {(["1K", "2K", "4K"] as const).map((r) => {
                  const blocked =
                    (r === "4K" && resolution4kBlocked) ||
                    (r !== "1K" && resolutionAutoBlocked);
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={blocked}
                      onClick={() => setResolution(r)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                        resolution === r && !blocked
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent"
                      } disabled:opacity-30`}
                      title={
                        blocked
                          ? r === "4K"
                            ? "1:1 长宽比不支持 4K"
                            : "auto 长宽比仅支持 1K"
                          : ""
                      }
                    >
                      {r}
                    </button>
                  );
                })}
              </div>
            </Field>
          ) : (
            <Field label="数量">
              <input
                type="number"
                min={1}
                max={4}
                value={count}
                onChange={(e) =>
                  setCount(Math.max(1, Math.min(4, Number(e.target.value))))
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </Field>
          )}
        </div>
        {useGptImage2Style && (
          <Field label="输出格式">
            <div className="flex gap-1">
              {(["png", "jpg"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setOutputFormat(f)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                    outputFormat === f
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent"
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </Field>
        )}
        {resolution4kBlocked && resolution === "4K" && (
          <p className="rounded-md bg-amber-100 p-2 text-xs text-amber-900">
            提示：1:1 长宽比不支持 4K，提交前请改为其他分辨率或长宽比
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={submit}
            disabled={
              loading ||
              !prompt.trim() ||
              !modelId ||
              (needImageInput && !imageUrl)
            }
            className="inline-flex h-10 flex-1 items-center justify-center rounded-md bg-primary text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {loading ? `${phase} ${progress}%` : "生成"}
          </button>
          {loading && (
            <button
              onClick={cancel}
              className="rounded-md border px-3 text-sm hover:bg-accent"
            >
              取消
            </button>
          )}
        </div>
        {loading && (
          <div className="h-1 w-full overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {error && (
          <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {error}
          </p>
        )}
      </div>

      <div className="rounded-lg border p-4">
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {loading ? `${phase} ...` : "结果将显示在这里"}
          </p>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {images.length} 张结果
              </span>
              <button
                onClick={favorite}
                className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
              >
                ★ 收藏
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {images.map((url, i) => (
                <div key={url} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`result ${i + 1}`}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                  <button
                    onClick={() => download(url, i)}
                    className="absolute bottom-2 right-2 rounded-md bg-background/90 px-2 py-1 text-xs opacity-0 transition group-hover:opacity-100"
                  >
                    下载
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
    </label>
  );
}

function capabilityLabel(c: Capability): string {
  return {
    "text-to-image": "文生图",
    "image-to-image": "图生图",
    upscale: "高清放大",
    inpaint: "局部重绘",
  }[c];
}
