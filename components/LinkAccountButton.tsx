"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDictionary } from "./LocaleProvider";

// Extract the last long number from an id or a character URL.
function parseId(s: string): number {
  const m = s.match(/\d{3,}/g);
  return m ? Number(m[m.length - 1]) : NaN;
}

export function LinkAccountButton({ id }: { id: number }) {
  const t = useDictionary();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const [err, setErr] = useState("");

  async function submit() {
    const other = parseId(val);
    if (!other || other === id) {
      setErr(t.character.linkMissing);
      return;
    }
    setErr("");
    const res = await fetch("/api/link", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ a: id, b: other }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(j.error || t.character.linkError);
      return;
    }
    setEditing(false);
    setVal("");
    start(() => router.refresh());
  }

  if (editing) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <input
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder={t.character.linkPlaceholder}
          className="bg-surface-2 border border-border rounded px-2 py-1.5 text-sm outline-none focus:border-primary w-64"
        />
        <button onClick={submit} disabled={pending} className="text-sm px-3 py-1.5 rounded bg-primary-strong text-white hover:opacity-90 disabled:opacity-50">
          {t.character.linkSubmit}
        </button>
        <button onClick={() => setEditing(false)} className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground">
          {t.common.cancel}
        </button>
        {err && <span className="text-red-400 text-xs w-full">{err}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground"
    >
      {t.character.linkAccount}
    </button>
  );
}
