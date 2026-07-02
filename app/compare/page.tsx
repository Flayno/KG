"use client";

import { useEffect, useRef, useState } from "react";
import { Card, PageTitle, Flag } from "@/components/Bits";
import { formatPower, formatNumber } from "@/lib/format";
import type { CharacterView } from "@/lib/types";

function Picker({
  label,
  onPick,
}: {
  label: string;
  onPick: (c: CharacterView) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<CharacterView[]>([]);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!q.trim()) return setResults([]);
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    const t = setTimeout(() => {
      fetch(`/api/character/search/select?search=${encodeURIComponent(q)}`, { signal: ac.signal })
        .then((r) => r.json())
        .then(setResults)
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [q]);

  return (
    <div>
      <label className="text-muted text-sm">{label}</label>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ник персонажа…"
        className="w-full mt-1 bg-surface border border-border rounded-lg px-3 py-2 outline-none focus:border-primary"
      />
      {results.length > 0 && (
        <div className="mt-1 flex flex-col gap-1 max-h-48 overflow-y-auto">
          {results.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                onPick(c);
                setQ("");
                setResults([]);
              }}
              className="text-left px-3 py-1.5 rounded hover:bg-surface-2 flex items-center gap-2"
            >
              <Flag flag={c.flag} />
              <span className="flex-1">{c.nickname}</span>
              <span className="text-primary text-sm">{formatPower(c.power)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const ROWS: { label: string; get: (c: CharacterView) => number; fmt: (n: number) => string }[] = [
  { label: "Мощь", get: (c) => Number(c.power), fmt: formatPower },
  { label: "Макс. мощь", get: (c) => Number(c.maxPower), fmt: formatPower },
  { label: "Уровень", get: (c) => c.level, fmt: formatNumber },
  { label: "PvP урон", get: (c) => Number(c.pvpDamage), fmt: formatPower },
];

export default function ComparePage() {
  const [a, setA] = useState<CharacterView | null>(null);
  const [b, setB] = useState<CharacterView | null>(null);

  return (
    <div>
      <PageTitle title="Сравнение персонажей" subtitle="Выберите двух персонажей" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Picker label="Персонаж A" onPick={setA} />
        <Picker label="Персонаж B" onPick={setB} />
      </div>

      {a && b && (
        <Card className="p-4 mt-5">
          <div className="grid grid-cols-3 gap-2 text-center font-semibold border-b border-border pb-2 mb-2">
            <div className="flex items-center justify-center gap-1">
              <Flag flag={a.flag} /> {a.nickname}
            </div>
            <div className="text-muted text-sm self-center">vs</div>
            <div className="flex items-center justify-center gap-1">
              <Flag flag={b.flag} /> {b.nickname}
            </div>
          </div>
          {ROWS.map((row) => {
            const va = row.get(a);
            const vb = row.get(b);
            return (
              <div key={row.label} className="grid grid-cols-3 gap-2 py-1.5 items-center">
                <div className={`text-right tabular-nums ${va >= vb ? "text-primary font-semibold" : ""}`}>
                  {row.fmt(va)}
                </div>
                <div className="text-muted text-xs text-center">{row.label}</div>
                <div className={`text-left tabular-nums ${vb >= va ? "text-primary font-semibold" : ""}`}>
                  {row.fmt(vb)}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
