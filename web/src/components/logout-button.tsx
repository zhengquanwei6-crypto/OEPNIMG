"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={logout}
      disabled={busy}
      className="rounded-md border px-2 py-1 text-xs hover:bg-accent disabled:opacity-50"
    >
      {busy ? "..." : "登出"}
    </button>
  );
}
