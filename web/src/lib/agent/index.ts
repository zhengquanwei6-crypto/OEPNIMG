/**
 * LLM Agent 主入口：URL → ProviderAdapter
 *
 * 流程：
 *   1. fetchDoc      抓取
 *   2. extractCleanText  清洗
 *   3. truncateForLlm    裁剪
 *   4. chatJson      LLM 输出 JSON
 *   5. parseAdapter  Zod 校验
 *   6. （可选）dryRunAdapter 网络干跑
 *
 * 输出：
 *   { ok: true, adapter, sourceDoc, raw } —— 调用方自行决定是否落库
 *   { ok: false, stage, error, ... }
 */
import { parseAdapter, type ProviderAdapter } from "../adapters/schema";
import { extractCleanText, truncateForLlm } from "./extract";
import { fetchDoc, type FetchedDoc } from "./fetcher";
import { chatJson } from "./llm";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompts";

export interface GenerateAdapterInput {
  /** 文档 URL（与 rawText 二选一） */
  sourceUrl?: string;
  /** 直接粘贴的 markdown / OpenAPI / 文本（与 sourceUrl 二选一） */
  rawText?: string;
  /** 用户给 LLM 的提示（如 "只关心 SD 接口"） */
  hint?: string;
}

export type GenerateAdapterResult =
  | {
      ok: true;
      adapter: ProviderAdapter;
      sourceDoc?: FetchedDoc;
      cleanedTextSize: number;
      llmRaw: string;
    }
  | {
      ok: false;
      stage: "fetch" | "llm" | "parse";
      error: string;
      llmRaw?: string;
      sourceDoc?: FetchedDoc;
    };

export async function generateAdapterFromDoc(
  input: GenerateAdapterInput,
): Promise<GenerateAdapterResult> {
  if (!input.sourceUrl && !input.rawText) {
    return { ok: false, stage: "fetch", error: "需要提供 sourceUrl 或 rawText" };
  }

  // 1) 抓取（或直接用 rawText）
  let sourceDoc: FetchedDoc | undefined;
  let rawContent: string;
  let contentType = "text/markdown";
  if (input.sourceUrl) {
    try {
      sourceDoc = await fetchDoc(input.sourceUrl);
      rawContent = sourceDoc.rawContent;
      contentType = sourceDoc.contentType;
    } catch (e) {
      return {
        ok: false,
        stage: "fetch",
        error: `抓取失败：${(e as Error).message}`,
      };
    }
  } else {
    rawContent = input.rawText!;
  }

  // 2) 清洗 + 截断
  const cleaned = extractCleanText(rawContent, contentType);
  const trimmed = truncateForLlm(cleaned);

  // 3) 调 LLM
  const userPrompt = buildUserPrompt({
    sourceUrl: input.sourceUrl,
    hint: input.hint,
    cleanedText: trimmed,
  });
  let llmResult;
  try {
    llmResult = await chatJson({
      system: SYSTEM_PROMPT,
      user: userPrompt,
      temperature: 0.1,
    });
  } catch (e) {
    return {
      ok: false,
      stage: "llm",
      error: `LLM 调用失败：${(e as Error).message}`,
      sourceDoc,
    };
  }
  if (!llmResult.ok) {
    return {
      ok: false,
      stage: "llm",
      error: `LLM 输出非合法 JSON：${llmResult.error}`,
      llmRaw: llmResult.raw,
      sourceDoc,
    };
  }

  // 4) Zod 校验
  const parsed = parseAdapter(llmResult.data);
  if (!parsed.ok) {
    return {
      ok: false,
      stage: "parse",
      error: `适配器校验失败：${parsed.error}`,
      llmRaw: llmResult.raw,
      sourceDoc,
    };
  }

  return {
    ok: true,
    adapter: parsed.data,
    sourceDoc,
    cleanedTextSize: cleaned.length,
    llmRaw: llmResult.raw,
  };
}

export { fetchDoc } from "./fetcher";
export { extractCleanText, truncateForLlm } from "./extract";
