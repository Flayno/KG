"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "./LocaleProvider";

export function BlacklistButton({
  id,
  blacklisted,
  reason,
}: {
  id: number;
  blacklisted: boolean;
  reason?: string | null;
}) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reason ?? "");

  async function add() {
    await fetch("/api/blacklist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, reason: text }),
    });
    setEditing(false);
    start(() => router.refresh());
  }
  async function remove() {
    await fetch(`/api/blacklist?id=${id}`, { method: "DELETE" });
    start(() => router.refresh());
  }

  if (blacklisted) {
    return (
      <button
        onClick={remove}
        disabled={pending}
        className="text-sm px-3 py-1.5 rounded border border-red-600 text-red-400 hover:bg-red-600/10 disabled:opacity-50"
      >
        {t.blacklist.unmark}
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
          placeholder={t.blacklist.reasonPlaceholder}
          className="bg-surface-2 border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-primary"
        />
        <button onClick={add} disabled={pending} className="text-sm px-3 py-1.5 rounded bg-red-600 text-white hover:opacity-90 disabled:opacity-50">
          {t.common.add}
        </button>
        <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground">
          {t.common.cancel}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground"
    >
      {t.blacklist.mark}
    </button>
  );
}
