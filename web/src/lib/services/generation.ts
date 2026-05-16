/**
 * 图片生成服务：组合 Provider + AdapterRunner + 数据库
 */
import { prisma } from "@/lib/db";
import { AdapterRunner, AdapterError } from "@/lib/adapters/runner";
import { parseAdapter } from "@/lib/adapters/schema";
import { decryptSecret } from "@/lib/crypto";
import type { GenerationInput, GenerationResult } from "@/lib/types";

export async function runGeneration(
  input: GenerationInput,
  ctx?: { userId?: string },
): Promise<GenerationResult> {
  // 1) 校验 Provider + Model
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

  // 2) 落库 queued 记录
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

  // 3) 调用 Runner
  const runner = new AdapterRunner(parsed.data, {
    apiKey: decryptSecret(provider.apiKeyEnc),
    baseUrl: provider.baseUrl,
  });
  try {
    const out = await runner.generate({
      modelId: model.modelKey,
      prompt: input.prompt,
      negativePrompt: input.negativePrompt,
      size: input.size,
      count: input.count,
      seed: input.seed,
      imageUrl: input.imageUrl,
      maskUrl: input.maskUrl,
      extra: input.extra,
    });
    await prisma.generation.update({
      where: { id: job.id },
      data: {
        status: "succeeded",
        progress: 100,
        resultUrlsJson: JSON.stringify(out.imageUrls),
        externalTaskId: out.externalTaskId,
        durationMs: out.durationMs,
        finishedAt: new Date(),
        lastRequestJson: safeJsonStringify(out.debug.request),
        lastResponseJson: safeJsonStringify(out.debug.response),
      },
    });
    return {
      id: job.id,
      status: "succeeded",
      progress: 100,
      imageUrls: out.imageUrls,
      durationMs: out.durationMs,
    };
  } catch (e) {
    const errMsg = e instanceof AdapterError ? e.message : (e as Error).message;
    await prisma.generation.update({
      where: { id: job.id },
      data: {
        status: "failed",
        errorMessage: errMsg,
        finishedAt: new Date(),
      },
    });
    return {
      id: job.id,
      status: "failed",
      progress: 0,
      imageUrls: [],
      errorMessage: errMsg,
    };
  }
}

function safeJsonStringify(v: unknown): string | null {
  try {
    return JSON.stringify(v).slice(0, 200_000);
  } catch {
    return null;
  }
}
