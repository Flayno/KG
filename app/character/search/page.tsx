"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, PageTitle, Flag, BlacklistMark } from "@/components/Bits";
import { Avatar } from "@/components/Avatar";
import { formatPower } from "@/lib/format";
import type { CharacterView } from "@/lib/types";

export default function CharacterSearchPage() {
  return (
    <Suspense>
      <SearchInner />
    </Suspense>
  );
}

function SearchInner() {
  const initial = useSearchParams().get("q") ?? "";
  const [q, setQ] = useState(initial);
  const [results, setResults] = useState<CharacterView[]>([]);
  const [loading, setLoading] = useState(false);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const t = setTimeout(() => {
      fetch(`/api/character/search/select?search=${encodeURIComponent(q)}`, {
        signal: ac.signal,
      })
        .then((r) => r.json())
        .then((data) => setResults(data))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  return (
    <div>
      <PageTitle title="Поиск персонажа" subtitle="Введите ник персонажа" />
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Например: Night..."
        className="w-full bg-surface border border-border rounded-lg px-4 py-2.5 outline-none focus:border-primary"
      />

      <div className="mt-4">
        {loading && <div className="text-muted text-sm">Поиск…</div>}
        {!loading && q && results.length === 0 && (
          <div className="text-muted text-sm">Ничего не найдено</div>
        )}
        <div className="flex flex-col gap-2">
          {results.map((c) => (
            <Link key={c.id} href={`/character/${c.id}`} className="no-underline">
              <Card className="px-4 py-2.5 hover:border-primary flex items-center gap-3">
                <Avatar src={c.avatar} name={c.nickname} size={32} rounded="rounded-md" />
                <Flag flag={c.flag} />
                <span className="font-medium text-foreground">
                  {c.nickname}
                  {c.alias && <span className="text-muted font-normal"> ({c.alias})</span>}
                </span>
                {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
                <span className="flex-1" />
                <span className="text-muted">
                  {c.alliance ? `[${c.alliance.label}]` : "—"}
                </span>
                <span className="text-muted text-sm">#{c.serverId}</span>
                <span className="text-primary font-semibold tabular-nums w-20 text-right">
                  {formatPower(c.maxPower)}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
