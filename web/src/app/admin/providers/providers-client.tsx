"use client";

import { useState } from "react";

interface Provider {
  id: string;
  slug: string;
  name: string;
  baseUrl: string;
  enabled: boolean;
  template: { id: string; name: string; version: string };
  models: { id: string; displayName: string; capability: string }[];
}

interface Template {
  id: string;
  name: string;
  version: string;
  templateKey: string;
  status: string;
}

export function ProvidersClient({
  providers,
  templates,
}: {
  providers: Provider[];
  templates: Template[];
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
        >
          {showForm ? "取消" : "新建 API 源"}
        </button>
      </div>

      {showForm && <NewProviderForm templates={templates} />}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/40 text-left">
            <tr>
              <th className="p-3">名称</th>
              <th className="p-3">Slug</th>
              <th className="p-3">模板</th>
              <th className="p-3">模型</th>
              <th className="p-3">状态</th>
            </tr>
          </thead>
          <tbody>
            {providers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  暂无 API 源
                </td>
              </tr>
            ) : (
              providers.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{p.name}</td>
                  <td className="p-3 font-mono text-xs">{p.slug}</td>
                  <td className="p-3 text-xs">
                    {p.template.name} <span className="text-muted-foreground">v{p.template.version}</span>
                  </td>
                  <td className="p-3 text-xs">{p.models.length} 个</td>
                  <td className="p-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        p.enabled
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {p.enabled ? "启用" : "停用"}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewProviderForm({ templates }: { templates: Template[] }) {
  const [form, setForm] = useState({
    name: "",
    slug: "",
    templateId: templates[0]?.id ?? "",
    baseUrl: "",
    apiKey: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error);
      setMsg("创建成功，刷新页面查看");
    } catch (e) {
      setMsg("失败：" + (e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2">
      <Field label="名称" required>
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <Field label="Slug（小写字母/数字/-）" required>
        <input
          required
          pattern="[a-z0-9][a-z0-9-]*"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
        />
      </Field>
      <Field label="适配器模板" required>
        <select
          value={form.templateId}
          onChange={(e) => setForm({ ...form, templateId: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        >
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              [{t.status}] {t.name} v{t.version}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Base URL（可选，覆盖模板默认值）">
        <input
          value={form.baseUrl}
          onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
          placeholder="https://api.relay.example.com/v1"
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
        />
      </Field>
      <Field label="API Key" required>
        <input
          required
          type="password"
          value={form.apiKey}
          onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono"
        />
      </Field>
      <Field label="描述（可选）">
        <input
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        />
      </Field>
      <div className="sm:col-span-2 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
        >
          {loading ? "创建中..." : "创建"}
        </button>
        {msg && <span className="text-xs text-muted-foreground">{msg}</span>}
      </div>
    </form>
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
