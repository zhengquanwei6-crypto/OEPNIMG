"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerationDetailClient({
  id,
  favorite: initFavorite,
  status,
}: {
  id: string;
  favorite: boolean;
  status: string;
}) {
  const router = useRouter();
  const [favorite, setFavorite] = useState(initFavorite);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggleFavorite() {
    setBusy("fav");
    try {
      const res = await fetch(`/api/generations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !favorite }),
      });
      const json = await res.json();
      if (json.ok) setFavorite(!favorite);
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm("删除该记录？（软删除，可在数据库恢复）")) return;
    setBusy("del");
    try {
      const res = await fetch(`/api/generations/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.ok) router.push("/admin/history");
    } finally {
      setBusy(null);
    }
  }

  async function cancel() {
    setBusy("cancel");
    try {
      await fetch(`/api/generations/${id}/cancel`, { method: "POST" });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  const cancellable = status === "running" || status === "polling" || status === "queued";

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={toggleFavorite}
        disabled={busy != null}
        className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
      >
        {favorite ? "★ 已收藏" : "☆ 收藏"}
      </button>
      {cancellable && (
        <button
          onClick={cancel}
          disabled={busy != null}
          className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent disabled:opacity-50"
        >
          取消任务
        </button>
      )}
      <button
        onClick={remove}
        disabled={busy != null}
        className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        删除记录
      </button>
    </div>
  );
}
