"use client";

import * as React from "react";
import { Key, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";

export function UsersClient() {
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [newUsername, setNewUsername] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const { toast } = useToast();

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 4) {
      toast({ title: "密码太短", description: "至少 4 个字符", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "密码不一致", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "密码已修改", variant: "success" });
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast({ title: "修改失败", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangeUsername(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: newUsername.trim() }),
      });
      const json = await res.json();
      if (json.ok) {
        toast({ title: "用户名已修改", description: `新用户名: ${newUsername}`, variant: "success" });
        setNewUsername("");
      } else {
        toast({ title: "修改失败", description: json.error, variant: "destructive" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Key className="h-4 w-4" /> 修改密码
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-1.5">
              <Label>新密码</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="输入新密码…" />
            </div>
            <div className="space-y-1.5">
              <Label>确认密码</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入…" />
            </div>
            <Button type="submit" loading={saving} disabled={!newPassword || !confirmPassword}>保存密码</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-4 w-4" /> 修改用户名
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangeUsername} className="space-y-4">
            <div className="space-y-1.5">
              <Label>新用户名</Label>
              <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="输入新用户名…" />
            </div>
            <Button type="submit" loading={saving} disabled={!newUsername.trim()}>保存用户名</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
