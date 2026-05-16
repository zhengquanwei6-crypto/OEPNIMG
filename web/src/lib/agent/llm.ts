/**
 * LLM 客户端 —— 统一调用任意 OpenAI 兼容中转站（自举）
 *
 * 由 .env 中的 AGENT_BASE_URL / AGENT_API_KEY / AGENT_MODEL 配置
 * 后续可改为从数据库的 Provider 中选一个"用于 Agent"的源，实现完全自举。
 */
import OpenAI from "openai";

let cached: OpenAI | null = null;

export function getAgentClient(): { client: OpenAI; model: string } {
  if (!cached) {
    const apiKey = process.env.AGENT_API_KEY;
    const baseURL = process.env.AGENT_BASE_URL ?? "https://api.openai.com/v1";
    if (!apiKey) {
      throw new Error(
        "未配置 AGENT_API_KEY。请在 .env 中设置 LLM 助手的 API Key（可走任意 OpenAI 兼容中转站）。",
      );
    }
    cached = new OpenAI({ apiKey, baseURL });
  }
  return { client: cached, model: process.env.AGENT_MODEL ?? "gpt-4o-mini" };
}

/**
 * 强制 JSON 输出，自动剥离常见 Markdown 围栏
 * 失败时返回 { ok:false, raw }
 */
export async function chatJson(args: {
  system: string;
  user: string;
  temperature?: number;
}): Promise<
  | { ok: true; data: unknown; raw: string }
  | { ok: false; error: string; raw: string }
> {
  const { client, model } = getAgentClient();
  const resp = await client.chat.completions.create({
    model,
    temperature: args.temperature ?? 0.1,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });
  const raw = resp.choices[0]?.message?.content ?? "";
  const cleaned = stripCodeFences(raw).trim();
  try {
    return { ok: true, data: JSON.parse(cleaned), raw };
  } catch (e) {
    return { ok: false, error: (e as Error).message, raw };
  }
}

function stripCodeFences(s: string): string {
  // ```json ... ```  →  ...
  const m = s.match(/^\s*```(?:json)?\s*\n([\s\S]*?)\n```\s*$/);
  return m ? m[1] : s;
}
