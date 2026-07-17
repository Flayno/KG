"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Flag, BlacklistMark } from "./Bits";
import { Avatar } from "./Avatar";
import { useDictionary } from "./LocaleProvider";
import { formatPower } from "@/lib/format";
import type { CharacterView } from "@/lib/types";

function parseCharacterId(search: string): number | null {
  const normalized = search.trim().replace(/^#/, "");
  if (!/^\d+$/.test(normalized)) return null;
  const id = Number(normalized);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function HeaderSearch({ variant = "nav" }: { variant?: "nav" | "hero" }) {
  const t = useDictionary();
  const hero = variant === "hero";
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CharacterView[]>([]);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const abort = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const hasQuery = q.trim().length > 0;
  const visibleResults = hasQuery ? results : [];

  useEffect(() => {
    if (!q.trim()) return;
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
    <div ref={boxRef} className={hero ? "relative w-full" : "relative flex-1 max-w-xs"}>
      {hero && (
        <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-subtle pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
        </svg>
      )}
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => visibleResults.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const id = parseCharacterId(q);
            if (id) go(id);
            else if (visibleResults[0]) go(visibleResults[0].id);
            else router.push(`/character/search?q=${encodeURIComponent(q)}`);
          }
        }}
        placeholder={hero ? t.search.headerHero : t.search.header}
        className={
          hero
            ? "w-full glass rounded-xl pl-11 pr-4 py-3.5 text-[15px] outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/20 transition"
            : "w-full bg-surface-2 border border-border rounded-md px-3 py-1.5 text-sm outline-none focus:border-primary"
        }
      />
      {open && visibleResults.length > 0 && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-surface border border-border rounded-lg shadow-xl max-h-80 overflow-y-auto z-30">
          {visibleResults.map((c) => (
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
              <span className="text-xs text-muted tabular-nums">ID {c.id}</span>
              {c.alliance && <span className="text-xs text-muted">[{c.alliance.label}]</span>}
              <span className="text-xs text-primary tabular-nums">{formatPower(c.maxPower)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
