"use client";

import { Fragment, useState } from "react";

interface TemplateRow {
  id: string;
  templateKey: string;
  version: string;
  name: string;
  description: string | null;
  status: string;
  lastDryRunOk: boolean | null;
  lastDryRunAt: Date | null;
  updatedAt: Date;
}

export function TemplatesClient({ templates }: { templates: TemplateRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left">
          <tr>
            <th className="p-3">名称</th>
            <th className="p-3">Key</th>
            <th className="p-3">版本</th>
            <th className="p-3">状态</th>
            <th className="p-3">最近干跑</th>
            <th className="p-3">更新时间</th>
            <th className="p-3 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          {templates.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-6 text-center text-muted-foreground">
                暂无模板
              </td>
            </tr>
          ) : (
            templates.map((t) => (
              <Fragment key={t.id}>
                <tr className="border-b last:border-0">
                  <td className="p-3 font-medium">{t.name}</td>
                  <td className="p-3 font-mono text-xs">{t.templateKey}</td>
                  <td className="p-3 font-mono text-xs">{t.version}</td>
                  <td className="p-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="p-3 text-xs">
                    {t.lastDryRunOk == null
                      ? "—"
                      : t.lastDryRunOk
                        ? "通过"
                        : "失败"}
                  </td>
                  <td className="p-3 text-xs text-muted-foreground">
                    {new Date(t.updatedAt).toLocaleString("zh-CN")}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setOpenId(openId === t.id ? null : t.id)}
                      className="rounded-md border px-2 py-1 text-xs hover:bg-accent"
                    >
                      {openId === t.id ? "关闭" : "操作"}
                    </button>
                  </td>
                </tr>
                {openId === t.id && (
                  <tr className="border-b last:border-0 bg-muted/30">
                    <td colSpan={7} className="p-4">
                      <TemplateActions tpl={t} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "published"
      ? "bg-emerald-100 text-emerald-700"
      : status === "draft"
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs ${cls}`}>{status}</span>
  );
}

function TemplateActions({ tpl }: { tpl: TemplateRow }) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [skipNetwork, setSkipNetwork] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function dryrun() {
    setBusy("dryrun");
    setMsg(null);
    try {
      const res = await fetch(`/api/templates/${tpl.id}/dryrun`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey, baseUrl: baseUrl || undefined, skipNetwork }),
      });
      const json = await res.json();
      if (!json.ok) setMsg(`失败：${json.error}`);
      else
        setMsg(
          `${json.data.ok ? "干跑通过" : "干跑失败"}：${json.data.message}`,
        );
    } catch (e) {
      setMsg(`错误：${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setMsg(null);
    try {
      const res = await fetch(`/api/templates/${tpl.id}/publish`, { method: "POST" });
      const json = await res.json();
      if (!json.ok) setMsg(`失败：${json.error}`);
      else {
        setMsg("已发布，刷新页面查看");
        setTimeout(() => window.location.reload(), 800);
      }
    } catch (e) {
      setMsg(`错误：${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        干跑会用你提供的 API Key 发起一次最小请求，验证模板可用性。仅 schema
        校验请勾选「跳过网络」。
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          type="password"
          placeholder="API Key（仅本次使用，不保存）"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 font-mono text-xs"
        />
        <input
          placeholder="可选：覆盖 baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 font-mono text-xs"
        />
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={skipNetwork}
            onChange={(e) => setSkipNetwork(e.target.checked)}
          />
          跳过网络（仅 schema 校验）
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={dryrun}
          disabled={busy != null || (!apiKey && !skipNetwork)}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          {busy === "dryrun" ? "干跑中..." : "干跑校验"}
        </button>
        {tpl.status !== "published" && (
          <button
            onClick={publish}
            disabled={busy != null}
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
          >
            {busy === "publish" ? "发布中..." : "发布为可用"}
          </button>
        )}
        {msg && <span className="text-xs">{msg}</span>}
      </div>
    </div>
  );
}
