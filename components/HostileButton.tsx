"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function HostileButton({
  id,
  hostile,
  reason,
}: {
  id: string;
  hostile: boolean;
  reason?: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reason ?? "");

  async function add() {
    await fetch("/api/hostile", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, reason: text }),
    });
    setEditing(false);
    start(() => router.refresh());
  }
  async function remove() {
    await fetch(`/api/hostile?id=${id}`, { method: "DELETE" });
    start(() => router.refresh());
  }

  if (hostile) {
    return (
      <button
        onClick={remove}
        disabled={pending}
        className="text-sm px-3 py-1.5 rounded border border-orange-500 text-orange-400 hover:bg-orange-500/10 disabled:opacity-50"
      >
        Снять метку «недружественный»
      </button>
    );
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Причина (необязательно)"
          className="bg-surface-2 border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button onClick={add} disabled={pending} className="text-sm px-3 py-1.5 rounded bg-orange-500 text-white hover:opacity-90 disabled:opacity-50">
          Отметить
        </button>
        <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground">
          Отмена
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground"
    >
      Отметить недружественным
    </button>
  );
}
