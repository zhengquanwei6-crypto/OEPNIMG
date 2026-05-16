/**
 * Adapter 干跑校验：
 *  1. 静态校验（schema 已通过）
 *  2. baseUrl 可达性（HEAD / GET）
 *  3. 用最小 prompt 调用第一个 text-to-image 模型，验证响应路径解析成功
 *
 * 干跑不会保存任何记录，但会消耗一次中转站调用配额。
 */
import { AdapterRunner } from "./runner";
import type { ProviderAdapter } from "./schema";

export interface DryRunResult {
  ok: boolean;
  message: string;
  imageUrls?: string[];
  durationMs?: number;
}

export async function dryRunAdapter(
  adapter: ProviderAdapter,
  apiKey: string,
  opts?: { skipNetwork?: boolean; samplePrompt?: string; baseUrl?: string },
): Promise<DryRunResult> {
  const sample = opts?.samplePrompt ?? "a tiny red apple on a white table";
  const t2i = adapter.models.find((m) => m.capability === "text-to-image");
  if (!t2i) {
    return { ok: false, message: "适配器未声明 text-to-image 模型，无法干跑" };
  }
  if (opts?.skipNetwork) {
    return { ok: true, message: "已跳过网络校验（仅 schema 通过）" };
  }
  if (!apiKey) {
    return { ok: false, message: "缺少 API Key，无法发起干跑请求" };
  }

  const runner = new AdapterRunner(adapter, {
    apiKey,
    baseUrl: opts?.baseUrl,
  });
  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), 60_000);
  try {
    const out = await runner.generate({
      modelId: t2i.id,
      prompt: sample,
      count: 1,
      signal: ctrl.signal,
    });
    return {
      ok: true,
      message: `干跑成功（${out.imageUrls.length} 张，${out.durationMs}ms）`,
      imageUrls: out.imageUrls,
      durationMs: out.durationMs,
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message ?? "干跑失败" };
  } finally {
    clearTimeout(timeout);
  }
}
