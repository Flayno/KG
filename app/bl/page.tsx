"use client";

import { useEffect, useRef, useState } from "react";
import { PageTitle } from "@/components/Bits";
import { useDictionary, useLocale } from "@/components/LocaleProvider";

const N = 24;
const CELL = 30;
const SIZE = N * CELL;
const MAP_SRC = "/bl-map.png";

type Mark = { m?: string; t?: string };
type Marks = Record<string, Mark>;

const BRUSH_CONFIG: { key: string; color?: string }[] = [
  { key: "atk", color: "#2ecc71" },
  { key: "def", color: "#4da3ff" },
  { key: "enemy", color: "#e74c3c" },
  { key: "note" },
  { key: "erase" },
];
const MARK_COLOR: Record<string, string> = Object.fromEntries(
  BRUSH_CONFIG.filter((b) => b.color).map((b) => [b.key, b.color!])
);

export default function BlPlannerPage() {
  const locale = useLocale();
  const t = useDictionary();
  const [marks, setMarks] = useState<Marks>({});
  const [brush, setBrush] = useState("atk");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [hasMap, setHasMap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const painting = useRef(false);
  const brushes = BRUSH_CONFIG.map((b) => ({
    ...b,
    label:
      b.key === "atk" ? t.bl.ourAttack :
      b.key === "def" ? t.bl.defense :
      b.key === "enemy" ? t.bl.enemyTarget :
      b.key === "note" ? t.bl.note :
      t.bl.eraser,
  }));

  useEffect(() => {
    fetch("/api/bl-plan")
      .then((r) => r.json())
      .then((d) => {
        setMarks(d.cells || {});
        setSaved(d.updatedAt ? new Date(d.updatedAt).toLocaleString(locale === "en" ? "en-US" : "ru-RU") : null);
      })
      .catch(() => {});
    const up = () => (painting.current = false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, [locale]);

  function apply(x: number, y: number) {
    const key = `${x}_${y}`;
    setMarks((prev) => {
      const next = { ...prev };
      const cur = next[key] ?? {};
      if (brush === "erase") delete next[key];
      else if (brush === "note") {
        const note = window.prompt(t.bl.notePrompt, cur.t ?? "");
        if (note === null) return prev;
        next[key] = { ...cur, t: note || undefined };
        if (!next[key].m && !next[key].t) delete next[key];
      } else next[key] = { ...cur, m: brush };
      return next;
    });
    setDirty(true);
  }

  async function save() {
    await fetch("/api/bl-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gridSize: N, cells: marks }),
    });
    setDirty(false);
    setSaved(new Date().toLocaleString(locale === "en" ? "en-US" : "ru-RU"));
  }

  return (
    <div>
      <PageTitle title={t.bl.title} subtitle={t.bl.subtitle} />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {brushes.map((b) => (
          <button
            key={b.key}
            onClick={() => setBrush(b.key)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border ${
              brush === b.key ? "border-primary text-foreground" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {b.color && <span className="w-3 h-3 rounded-full inline-block" style={{ background: b.color }} />}
            {b.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-border" />
        <label className="text-sm text-muted inline-flex items-center gap-1">
          <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> {t.bl.grid}
        </label>
        <button onClick={() => { if (confirm(t.bl.clearConfirm)) { setMarks({}); setDirty(true); } }} className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground">
          {t.bl.clear}
        </button>
        <button onClick={save} disabled={!dirty} className="text-sm px-4 py-1.5 rounded bg-primary-strong text-white disabled:opacity-40">
          {t.common.save}
        </button>
        <span className="text-xs text-muted">{dirty ? t.bl.dirty : saved ? t.bl.saved(saved) : ""}</span>
      </div>

      {!hasMap && (
        <div className="mb-3 text-sm text-orange-400 border border-orange-500/40 rounded p-3 max-w-xl">
          {t.bl.mapMissing} <code className="text-foreground">public/bl-map.png</code> {t.bl.mapMissingTail}
        </div>
      )}

      <div className="overflow-auto">
        <div className="relative select-none touch-none" style={{ width: SIZE, height: SIZE }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={MAP_SRC}
            alt="BL map"
            width={SIZE}
            height={SIZE}
            onError={() => setHasMap(false)}
            className="absolute inset-0 rounded"
            style={{ width: SIZE, height: SIZE, objectFit: "cover", background: "#c9a06a" }}
          />
          <div
            className="absolute inset-0 grid"
            style={{ gridTemplateColumns: `repeat(${N}, ${CELL}px)`, gridTemplateRows: `repeat(${N}, ${CELL}px)` }}
          >
            {Array.from({ length: N * N }).map((_, i) => {
              const x = i % N;
              const y = Math.floor(i / N);
              const mk = marks[`${x}_${y}`];
              const markColor = mk?.m ? MARK_COLOR[mk.m] : null;
              return (
                <div
                  key={i}
                  onPointerDown={(e) => { e.preventDefault(); painting.current = true; apply(x, y); }}
                  onPointerEnter={() => { if (painting.current && brush !== "note") apply(x, y); }}
                  title={mk?.t || `${x},${y}`}
                  className="relative"
                  style={{
                    width: CELL, height: CELL, cursor: "pointer",
                    border: showGrid ? "1px solid rgba(0,0,0,0.18)" : "none",
                    boxShadow: markColor ? `inset 0 0 0 3px ${markColor}` : undefined,
                    background: markColor ? `${markColor}22` : undefined,
                  }}
                >
                  {mk?.t && (
                    <span className="absolute bottom-0 inset-x-0 text-[8px] leading-tight text-black font-bold text-center bg-white/75 truncate px-px">
                      {mk.t}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted">
        {brushes.filter((b) => b.color).map((b) => (
          <span key={b.key} className="inline-flex items-center gap-1">
            <span className="w-3 h-3 rounded-full inline-block" style={{ background: b.color }} /> {b.label}
          </span>
        ))}
      </div>
      <p className="text-muted text-xs mt-2">
        {t.bl.help}
      </p>
    </div>
  );
}
