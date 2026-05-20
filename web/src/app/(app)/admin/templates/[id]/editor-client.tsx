"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Initial {
  name: string;
  description: string;
  version: string;
  status: "draft" | "published" | "archived";
  configJson: string;
}

export function TemplateEditor({ id, initial }: { id: string; initial: Initial }) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [version, setVersion] = useState(initial.version);
  const [status, setStatus] = useState<Initial["status"]>(initial.status);
  const [configJson, setConfigJson] = useState(initial.configJson);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    setParseError(null);
    let config: unknown;
    try {
      config = JSON.parse(configJson);
    } catch (e) {
      setParseError(`JSON 解析失败：${(e as Error).message}`);
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, version, status, config }),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setMsg("保存成功");
      router.refresh();
    } catch (e) {
      setMsg(`失败：${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function format() {
    try {
      const v = JSON.parse(configJson);
      setConfigJson(JSON.stringify(v, null, 2));
      setParseError(null);
    } catch (e) {
      setParseError(`JSON 解析失败：${(e as Error).message}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="名称">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
        </Field>
        <Field label="版本">
          <input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
          />
        </Field>
        <Field label="状态">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Initial["status"])}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
            <option value="archived">archived</option>
          </select>
        </Field>
      </div>
      <Field label="描述">
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Adapter Config (JSON)">
        <textarea
          rows={20}
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          spellCheck={false}
          className="w-full rounded-md border bg-background px-3 py-2 font-mono text-xs"
        />
      </Field>
      {parseError && (
        <p className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          {parseError}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={format}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
        >
          格式化 JSON
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-md bg-primary px-4 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
        >
          {busy ? "保存中..." : "保存"}
        </button>
        {msg && <span className="self-center text-xs">{msg}</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
