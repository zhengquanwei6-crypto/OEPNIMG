/**
 * AdapterRunner —— 统一调用任意 API 中转站
 *
 *   const runner = new AdapterRunner(adapter, { apiKey });
 *   const result = await runner.generate({
 *     modelId: "dall-e-3",
 *     prompt: "a cat",
 *     onProgress: (p) => ...,
 *   });
 *
 * 不依赖数据库 —— 输入 Adapter JSON + 凭证即可执行。
 * 由调用方（如 services/generation.ts）负责持久化 Generation 记录。
 */
import { extractByPath } from "./jsonpath";
import { renderTemplate, type TemplateVars } from "./template";
import {
  type ProviderAdapter,
  type AdapterModel,
  type AdapterAuth,
} from "./schema";

export interface RunnerCredentials {
  apiKey: string;
  /** 覆盖 adapter.baseUrl —— 同一模板可用于多个具体 Provider */
  baseUrl?: string;
  /** 用户级附加 headers */
  extraHeaders?: Record<string, string>;
}

export interface RunInput {
  modelId: string;
  prompt: string;
  negativePrompt?: string;
  size?: string;
  count?: number;
  seed?: number;
  imageUrl?: string;
  maskUrl?: string;
  /** 业务自定义参数（合并进模板变量） */
  extra?: Record<string, unknown>;
  /** 进度回调（0-100） */
  onProgress?: (progress: number) => void;
  /** 取消信号 */
  signal?: AbortSignal;
}

export interface RunOutput {
  imageUrls: string[];
  externalTaskId?: string;
  durationMs: number;
  /** 调试快照 */
  debug: {
    request: { url: string; method: string; headers: Record<string, string>; body?: unknown };
    response: unknown;
    pollingHistory?: Array<{ at: string; status?: string; progress?: number }>;
  };
}

export class AdapterError extends Error {
  constructor(
    message: string,
    public readonly stage:
      | "config"
      | "request"
      | "parse"
      | "polling"
      | "timeout"
      | "canceled",
    public readonly cause?: unknown,
    /** 调试快照（如已发送的请求 + 收到的响应） */
    public readonly debug?: RunOutput["debug"],
  ) {
    super(message);
    this.name = "AdapterError";
  }
}

export class AdapterRunner {
  constructor(
    private readonly adapter: ProviderAdapter,
    private readonly creds: RunnerCredentials,
  ) {}

  // ----------------------------------------------------------------- public

  async generate(input: RunInput): Promise<RunOutput> {
    const model = this.findModel(input.modelId);
    const startedAt = Date.now();

    const vars = this.buildVars(input);
    const renderedBody = renderTemplate(model.request.bodyTemplate, vars);
    const renderedQuery = model.request.queryTemplate
      ? renderTemplate(model.request.queryTemplate, vars)
      : undefined;

    const url = this.buildUrl(model.endpoint.path, vars, renderedQuery);
    const headers = this.buildHeaders(model);
    if (model.request.headers) Object.assign(headers, model.request.headers);

    const reqInit: RequestInit = {
      method: model.endpoint.method,
      headers,
      signal: input.signal,
    };
    const contentType = model.request.contentType ?? "application/json";
    if (
      ["POST", "PUT", "PATCH"].includes(model.endpoint.method) &&
      Object.keys(renderedBody as object).length > 0
    ) {
      headers["Content-Type"] = contentType;
      reqInit.body =
        contentType === "application/json"
          ? JSON.stringify(renderedBody)
          : (encodeForm(renderedBody as Record<string, unknown>) as string);
    }

    const debug: RunOutput["debug"] = {
      request: { url, method: model.endpoint.method, headers, body: renderedBody },
      response: null,
    };

    let raw: unknown;
    try {
      const res = await fetch(url, reqInit);
      raw = await safeJson(res);
      debug.response = raw;
      if (!res.ok) {
        const errMsg = this.extractError(raw, model) ?? `HTTP ${res.status}`;
        throw new AdapterError(`中转站返回错误：${errMsg}`, "request", undefined, debug);
      }
    } catch (e) {
      if (e instanceof AdapterError) throw e;
      if ((e as Error).name === "AbortError")
        throw new AdapterError("已取消", "canceled", e, debug);
      throw new AdapterError((e as Error).message ?? "请求失败", "request", e, debug);
    }

    // -------- sync --------
    if (model.response.type === "sync") {
      const urls = this.extractImageUrls(raw, model.response.imageUrlPath);
      if (urls.length === 0) {
        throw new AdapterError(
          `未在响应中提取到图片 URL（path: ${model.response.imageUrlPath}）`,
          "parse",
          undefined,
          debug,
        );
      }
      input.onProgress?.(100);
      return {
        imageUrls: urls,
        durationMs: Date.now() - startedAt,
        debug,
      };
    }

    // -------- async-polling --------
    const taskId = extractByPath(raw, model.response.taskIdPath);
    if (!taskId || Array.isArray(taskId)) {
      const errMsg = this.extractError(raw, model);
      throw new AdapterError(
        errMsg
          ? `中转站返回错误：${errMsg}`
          : `未提取到任务 ID（path: ${model.response.taskIdPath}）`,
        "parse",
        undefined,
        debug,
      );
    }

    const pollingHistory: NonNullable<RunOutput["debug"]["pollingHistory"]> = [];
    const finalUrls = await this.poll({
      model,
      taskId,
      onProgress: input.onProgress,
      signal: input.signal,
      history: pollingHistory,
    });
    debug.pollingHistory = pollingHistory;

    return {
      imageUrls: finalUrls,
      externalTaskId: taskId,
      durationMs: Date.now() - startedAt,
      debug,
    };
  }

  // ----------------------------------------------------------------- helpers

  private findModel(id: string): AdapterModel {
    const m = this.adapter.models.find((m) => m.id === id);
    if (!m) throw new AdapterError(`adapter 中不存在 model: ${id}`, "config");
    return m;
  }

  private buildVars(input: RunInput): TemplateVars {
    return {
      prompt: input.prompt,
      negativePrompt: input.negativePrompt ?? "",
      size: input.size ?? "",
      n: input.count ?? "",
      seed: input.seed ?? "",
      imageUrl: input.imageUrl ?? "",
      maskUrl: input.maskUrl ?? "",
      API_KEY: this.creds.apiKey,
      ...((input.extra as TemplateVars) ?? {}),
    };
  }

  private buildHeaders(model: AdapterModel): Record<string, string> {
    const h: Record<string, string> = { Accept: "application/json" };
    // 全局 header
    if (this.adapter.headers) Object.assign(h, this.adapter.headers);
    // 鉴权
    applyAuth(h, this.adapter.auth, this.creds.apiKey);
    // 模型级 header
    if (model.request.headers) Object.assign(h, model.request.headers);
    // 用户附加
    if (this.creds.extraHeaders) Object.assign(h, this.creds.extraHeaders);
    return h;
  }

  private buildUrl(
    path: string,
    vars: TemplateVars,
    query: Record<string, unknown> | undefined,
  ): string {
    const base = (this.creds.baseUrl ?? this.adapter.baseUrl).replace(/\/$/, "");
    const renderedPath = renderTemplate(path, vars) as string;
    let url = `${base}${renderedPath.startsWith("/") ? "" : "/"}${renderedPath}`;
    // query string for GET / 也允许 POST 携带
    if (this.adapter.auth.type === "query") {
      const sep = url.includes("?") ? "&" : "?";
      url += `${sep}${encodeURIComponent(this.adapter.auth.key)}=${encodeURIComponent(
        this.creds.apiKey,
      )}`;
    }
    if (query && Object.keys(query).length) {
      const usp = new URLSearchParams();
      for (const [k, v] of Object.entries(query)) {
        if (v === undefined || v === null || v === "") continue;
        usp.set(k, String(v));
      }
      const qs = usp.toString();
      if (qs) url += `${url.includes("?") ? "&" : "?"}${qs}`;
    }
    return url;
  }

  private extractError(raw: unknown, model: AdapterModel): string | undefined {
    const path = model.response.errorPath;
    if (!path) return undefined;
    const v = extractByPath(raw, path);
    return Array.isArray(v) ? v.join("; ") : v;
  }

  private extractImageUrls(raw: unknown, path: string): string[] {
    const v = extractByPath(raw, path);
    if (!v) return [];
    if (Array.isArray(v)) return v.filter((s) => typeof s === "string" && s.length > 0);
    return [v];
  }

  private async poll(args: {
    model: AdapterModel;
    taskId: string;
    onProgress?: (p: number) => void;
    signal?: AbortSignal;
    history: NonNullable<RunOutput["debug"]["pollingHistory"]>;
  }): Promise<string[]> {
    const { model, taskId, onProgress, signal, history } = args;
    if (model.response.type !== "async-polling") return [];
    const cfg = model.response.polling;

    const deadline = Date.now() + cfg.timeoutMs;

    const baseHeaders: Record<string, string> = { Accept: "application/json" };
    if (this.adapter.headers) Object.assign(baseHeaders, this.adapter.headers);
    applyAuth(baseHeaders, this.adapter.auth, this.creds.apiKey);
    if (cfg.headers) Object.assign(baseHeaders, cfg.headers);
    if (this.creds.extraHeaders) Object.assign(baseHeaders, this.creds.extraHeaders);

    while (Date.now() < deadline) {
      if (signal?.aborted) throw new AdapterError("已取消", "canceled");

      const vars: TemplateVars = { taskId, API_KEY: this.creds.apiKey };
      const url = this.buildUrl(cfg.endpoint.path, vars, undefined);
      const init: RequestInit = {
        method: cfg.endpoint.method,
        headers: baseHeaders,
        signal,
      };
      if (cfg.bodyTemplate && cfg.endpoint.method !== "GET") {
        const body = renderTemplate(cfg.bodyTemplate, vars);
        init.headers = { ...baseHeaders, "Content-Type": "application/json" };
        init.body = JSON.stringify(body);
      }

      let raw: unknown;
      try {
        const res = await fetch(url, init);
        raw = await safeJson(res);
        if (!res.ok) {
          throw new AdapterError(
            `轮询返回 HTTP ${res.status}：${this.extractError(raw, model) ?? ""}`.trim(),
            "polling",
          );
        }
      } catch (e) {
        if (e instanceof AdapterError) throw e;
        throw new AdapterError((e as Error).message ?? "轮询失败", "polling", e);
      }

      const status = String(extractByPath(raw, cfg.statusPath) ?? "");
      const progress = cfg.progressPath
        ? Number(extractByPath(raw, cfg.progressPath))
        : undefined;
      history.push({ at: new Date().toISOString(), status, progress });
      if (typeof progress === "number" && Number.isFinite(progress)) {
        onProgress?.(Math.min(100, Math.max(0, Math.round(progress))));
      }

      if (cfg.failStatuses.includes(status)) {
        const msg = this.extractError(raw, model) ?? "任务失败";
        throw new AdapterError(`任务失败：${msg}`, "polling");
      }
      if (cfg.doneStatuses.includes(status)) {
        const urls = this.extractImageUrls(raw, cfg.imageUrlPath);
        if (urls.length === 0) {
          throw new AdapterError(
            `任务完成但未提取到图片 URL（path: ${cfg.imageUrlPath}）`,
            "parse",
          );
        }
        onProgress?.(100);
        return urls;
      }

      await sleep(cfg.intervalMs, signal);
    }
    throw new AdapterError("任务超时", "timeout");
  }
}

// =========================================================================
// 工具函数
// =========================================================================

function applyAuth(
  headers: Record<string, string>,
  auth: AdapterAuth,
  apiKey: string,
) {
  switch (auth.type) {
    case "bearer": {
      const v = (auth.valueTemplate ?? "Bearer {API_KEY}").replace(
        "{API_KEY}",
        apiKey,
      );
      headers["Authorization"] = v;
      return;
    }
    case "header": {
      headers[auth.key] = auth.valueTemplate.replace("{API_KEY}", apiKey);
      return;
    }
    case "query":
      // 在 buildUrl 中处理
      return;
    case "none":
      return;
  }
}

async function safeJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function encodeForm(obj: Record<string, unknown>): string {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    u.set(k, typeof v === "object" ? JSON.stringify(v) : String(v));
  }
  return u.toString();
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AdapterError("已取消", "canceled"));
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new AdapterError("已取消", "canceled"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}
