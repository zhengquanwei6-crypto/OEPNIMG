/**
 * 图片生成服务：组合 Provider + AdapterRunner + 数据库
 *
 * 提供两种调用方式：
 *   - runGeneration       :  阻塞，返回最终结果（适合简单的 /api/generate）
 *   - runGenerationStream :  流式，按事件推送给 SSE
 *
 * 支持中途取消（AbortSignal）。
 */
import { prisma } from "@/lib/db";
import { AdapterRunner, AdapterError } from "@/lib/adapters/runner";
import { parseAdapter } from "@/lib/adapters/schema";
import { decryptSecret } from "@/lib/crypto";
import type { GenerationInput, GenerationResult } from "@/lib/types";

const inflight = new Map<string, AbortController>();

export type GenerationEvent =
  | { type: "queued"; id: string }
  | { type: "running"; id: string }
  | { type: "progress"; id: string; progress: number }
  | { type: "succeeded"; id: string; imageUrls: string[]; durationMs: number }
  | { type: "failed"; id: string; error: string }
  | { type: "canceled"; id: string };

export async function* runGenerationStream(
  input: GenerationInput,
  ctx?: { userId?: string; signal?: AbortSignal },
): AsyncGenerator<GenerationEvent, void, unknown> {
  const provider = await prisma.provider.findUnique({
    where: { id: input.providerId },
    include: { template: true, models: true },
  });
  if (!provider) throw new Error("Provider 不存在");
  if (!provider.enabled) throw new Error("Provider 已停用");
  const model = provider.models.find((m) => m.id === input.modelId);
  if (!model) throw new Error("Model 不存在");
  if (!model.enabled) throw new Error("Model 已停用");
  const parsed = parseAdapter(JSON.parse(provider.template.configJson));
  if (!parsed.ok) throw new Error(`Adapter 配置无效：${parsed.error}`);

  const job = await prisma.generation.create({
    data: {
      userId: ctx?.userId,
      providerId: provider.id,
      modelId: model.id,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      size: input.size,
      count: input.count ?? 1,
      seed: input.seed,
      paramsJson: JSON.stringify(input.extra ?? {}),
      status: "running",
      startedAt: new Date(),
    },
  });

  yield { type: "queued", id: job.id };
  yield { type: "running", id: job.id };

  // 注册取消器
  const ctrl = new AbortController();
  inflight.set(job.id, ctrl);
  if (ctx?.signal) {
    if (ctx.signal.aborted) ctrl.abort();
    else ctx.signal.addEventListener("abort", () => ctrl.abort(), { once: true });
  }

  // 进度回调通过队列桥接（runner 是回调式，generator 是 pull 式）
  const queue: GenerationEvent[] = [];
  let resolveNext: ((v: void) => void) | null = null;
  const push = (e: GenerationEvent) => {
    queue.push(e);
    resolveNext?.();
    resolveNext = null;
  };

  const runner = new AdapterRunner(parsed.data, {
    apiKey: decryptSecret(provider.apiKeyEnc),
    baseUrl: provider.baseUrl,
  });
  const runP = runner.generate({
    modelId: model.modelKey,
    prompt: input.prompt,
    negativePrompt: input.negativePrompt,
    size: input.size,
    count: input.count,
    seed: input.seed,
    imageUrl: input.imageUrl,
    maskUrl: input.maskUrl,
    extra: input.extra,
    signal: ctrl.signal,
    onProgress: (p) =>
      push({ type: "progress", id: job.id, progress: p }),
  });

  let done = false;
  let finalResult:
    | { ok: true; imageUrls: string[]; durationMs: number; debug: unknown }
    | { ok: false; error: string; canceled: boolean; debug?: unknown };
  runP.then(
    (out) => {
      finalResult = {
        ok: true,
        imageUrls: out.imageUrls,
        durationMs: out.durationMs,
        debug: out.debug,
      };
      done = true;
      resolveNext?.();
      resolveNext = null;
    },
    (err: unknown) => {
      const ae = err instanceof AdapterError ? err : null;
      const canceled = ae?.stage === "canceled" || ctrl.signal.aborted;
      finalResult = {
        ok: false,
        error: (err as Error).message ?? "生成失败",
        canceled,
        debug: ae?.debug,
      };
      done = true;
      resolveNext?.();
      resolveNext = null;
    },
  );

  while (!done || queue.length > 0) {
    if (queue.length > 0) {
      yield queue.shift()!;
      continue;
    }
    if (done) break;
    await new Promise<void>((r) => (resolveNext = r));
  }

  inflight.delete(job.id);

  if (finalResult!.ok) {
    await prisma.generation.update({
      where: { id: job.id },
      data: {
        status: "succeeded",
        progress: 100,
        resultUrlsJson: JSON.stringify(finalResult!.imageUrls),
        durationMs: finalResult!.durationMs,
        finishedAt: new Date(),
        lastResponseJson: safeJsonStringify(finalResult!.debug),
      },
    });
    yield {
      type: "succeeded",
      id: job.id,
      imageUrls: finalResult!.imageUrls,
      durationMs: finalResult!.durationMs,
    };
  } else if (finalResult!.canceled) {
    await prisma.generation.update({
      where: { id: job.id },
      data: { status: "canceled", finishedAt: new Date() },
    });
    yield { type: "canceled", id: job.id };
  } else {
    await prisma.generation.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: finalResult!.error.slice(0, 1000),
        finishedAt: new Date(),
        lastResponseJson: finalResult!.debug
          ? safeJsonStringify(finalResult!.debug)
          : undefined,
      },
    });
    yield { type: "failed", id: job.id, error: finalResult!.error };
  }
}

export async function runGeneration(
  input: GenerationInput,
  ctx?: { userId?: string; signal?: AbortSignal },
): Promise<GenerationResult> {
  let last: GenerationResult = {
    id: "",
    status: "queued",
    progress: 0,
    imageUrls: [],
  };
  for await (const e of runGenerationStream(input, ctx)) {
    if (e.type === "queued") last = { ...last, id: e.id };
    else if (e.type === "running") last = { ...last, status: "running" };
    else if (e.type === "progress")
      last = { ...last, status: "running", progress: e.progress };
    else if (e.type === "succeeded")
      last = {
        id: e.id,
        status: "succeeded",
        progress: 100,
        imageUrls: e.imageUrls,
        durationMs: e.durationMs,
      };
    else if (e.type === "failed")
      last = { id: e.id, status: "failed", progress: 0, imageUrls: [], errorMessage: e.error };
    else if (e.type === "canceled")
      last = { id: e.id, status: "canceled", progress: 0, imageUrls: [] };
  }
  return last;
}

export function cancelGeneration(jobId: string): boolean {
  const c = inflight.get(jobId);
  if (!c) return false;
  c.abort();
  return true;
}

function safeJsonStringify(v: unknown): string | null {
  try {
    return JSON.stringify(v).slice(0, 200_000);
  } catch {
    return null;
  }
}
