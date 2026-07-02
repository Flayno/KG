"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, BlacklistMark } from "./Bits";
import { Avatar } from "./Avatar";
import { formatPower } from "@/lib/format";
import type { CharacterView } from "@/lib/types";

export function HeaderSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CharacterView[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const abort = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const t = setTimeout(() => {
      fetch(`/api/character/search/select?search=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then((d) => {
          setResults(d);
          setOpen(true);
        })
        .catch(() => {});
    }, 220);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(id: number) {
    setOpen(false);
    setQ("");
    setResults([]);
    router.push(`/character/${id}`);
  }

  return (
    <div ref={boxRef} className="relative flex-1 max-w-xs">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            if (results[0]) go(results[0].id);
            else router.push(`/character/search?q=${encodeURIComponent(q)}`);
          }
        }}
        placeholder="Поиск игрока…"
        className="w-full bg-surface-2 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary"
      />
      {open && results.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto z-30">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => go(c.id)}
              className="w-full text-left px-3 py-2 hover:bg-surface-2 flex items-center gap-2"
            >
              <Avatar src={c.avatar} name={c.nickname} size={24} rounded="rounded" />
              <Flag flag={c.flag} size={14} />
              <span className="truncate text-sm text-foreground">
                {c.nickname}
                {c.alias && <span className="text-muted"> ({c.alias})</span>}
              </span>
              {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
              <span className="flex-1" />
              {c.alliance && <span className="text-xs text-muted">[{c.alliance.label}]</span>}
              <span className="text-xs text-primary tabular-nums">{formatPower(c.maxPower)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
