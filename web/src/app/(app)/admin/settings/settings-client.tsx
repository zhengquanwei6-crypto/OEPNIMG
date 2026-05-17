"use client";

import * as React from "react";
import { Save, Eye, EyeOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";

interface Setting {
  key: string;
  value: string;
  valueType: string;
  description: string | null;
  sensitive: boolean;
}

export function SettingsClient() {
  const [settings, setSettings] = React.useState<Setting[]>([]);
  const [edits, setEdits] = React.useState<Record<string, string>>({});
  const [revealed, setRevealed] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();

  const fetchSettings = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/settings");
    const json = await res.json();
    if (json.ok) setSettings(json.data);
    setLoading(false);
  }, []);

  React.useEffect(() => { fetchSettings(); }, [fetchSettings]);

  function handleChange(key: string, value: string) {
    setEdits((prev) => ({ ...prev, [key]: value }));
  }

  function getValue(s: Setting) {
    if (key in edits) return edits[s.key];
    return s.value;
  }

  const key = (s: Setting) => s.key;
  const hasEdits = Object.keys(edits).length > 0;

  async function handleSave() {
    if (!hasEdits) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: edits }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "保存成功", description: `已更新 ${Object.keys(edits).length} 项设置`, variant: "success" });
        setEdits({});
        fetchSettings();
      } else {
        toast({ title: "保存失败", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  // Group settings by category
  const groups = [
    { title: "管理员", keys: ["admin_password"] },
    { title: "安全", keys: ["session_secret", "master_key", "cookie_secure"] },
    { title: "LLM 助手", keys: ["agent_base_url", "agent_api_key", "agent_model"] },
    { title: "限流", keys: ["login_rate_limit_max", "login_rate_limit_window_ms"] },
    { title: "文档抓取", keys: ["fetch_timeout_ms", "fetch_max_bytes"] },
    { title: "其他", keys: ["default_provider_id", "site_notice"] },
  ];

  if (loading) {
    return <div className="space-y-4">{[1,2,3].map((i) => <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />)}</div>;
  }

  return (
    <div className="space-y-6">
      {groups.map((g) => {
        const items = settings.filter((s) => g.keys.includes(s.key));
        if (items.length === 0) return null;
        return (
          <Card key={g.title}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{g.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((s) => (
                <SettingField
                  key={s.key}
                  setting={s}
                  editValue={edits[s.key]}
                  revealed={revealed.has(s.key)}
                  onToggleReveal={() => setRevealed((prev) => { const n = new Set(prev); n.has(s.key) ? n.delete(s.key) : n.add(s.key); return n; })}
                  onChange={(v) => handleChange(s.key, v)}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Save bar */}
      {hasEdits && (
        <div className="sticky bottom-4 flex items-center justify-between rounded-lg border bg-card p-4 shadow-lg">
          <span className="text-sm text-muted-foreground">
            {Object.keys(edits).length} 项待保存
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEdits({})}>取消</Button>
            <Button onClick={handleSave} loading={saving}>
              <Save className="mr-2 h-4 w-4" /> 保存
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingField({ setting, editValue, revealed, onToggleReveal, onChange }: {
  setting: Setting;
  editValue?: string;
  revealed: boolean;
  onToggleReveal: () => void;
  onChange: (v: string) => void;
}) {
  const value = editValue ?? setting.value;
  const isBool = setting.valueType === "boolean";
  const isSecret = setting.sensitive;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Label className="text-sm font-medium">{setting.key}</Label>
        {isSecret && <Badge variant="secondary" className="text-[10px]">敏感</Badge>}
      </div>
      {setting.description && (
        <p className="text-xs text-muted-foreground">{setting.description}</p>
      )}

      {isBool ? (
        <Switch
          checked={value === "true" || value === "1"}
          onCheckedChange={(checked) => onChange(checked ? "true" : "false")}
        />
      ) : (
        <div className="relative">
          <Input
            type={isSecret && !revealed ? "password" : "text"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={isSecret ? "输入新值…" : ""}
            className="pr-10"
          />
          {isSecret && (
            <button
              type="button"
              onClick={onToggleReveal}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
