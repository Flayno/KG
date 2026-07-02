"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PageTitle } from "@/components/Bits";
import {
  generateBlMap, BL_SIZE, FACTION_INFO, POI_INFO, TERRAIN_COLOR,
} from "@/lib/blMap";

type Mark = { m?: string; t?: string };
type Marks = Record<string, Mark>;

const BRUSHES: { key: string; label: string; color?: string }[] = [
  { key: "atk", label: "Наша атака", color: "#2ecc71" },
  { key: "def", label: "Оборона", color: "#4da3ff" },
  { key: "enemy", label: "Цель врага", color: "#e74c3c" },
  { key: "note", label: "Заметка" },
  { key: "erase", label: "Ластик" },
];
const MARK_COLOR: Record<string, string> = Object.fromEntries(
  BRUSHES.filter((b) => b.color).map((b) => [b.key, b.color!])
);

export default function BlPlannerPage() {
  const base = useMemo(() => generateBlMap(), []);
  const [marks, setMarks] = useState<Marks>({});
  const [brush, setBrush] = useState("atk");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const painting = useRef(false);

  useEffect(() => {
    fetch("/api/bl-plan")
      .then((r) => r.json())
      .then((d) => {
        setMarks(d.cells || {});
        setSaved(d.updatedAt ? new Date(d.updatedAt).toLocaleString("ru-RU") : null);
      })
      .catch(() => {});
    const up = () => (painting.current = false);
    window.addEventListener("pointerup", up);
    return () => window.removeEventListener("pointerup", up);
  }, []);

  function apply(x: number, y: number) {
    const terr = base[y][x].terrain;
    if (terr === "mountain" || terr === "rift") return; // impassable
    const key = `${x}_${y}`;
    setMarks((prev) => {
      const next = { ...prev };
      const cur = next[key] ?? {};
      if (brush === "erase") {
        delete next[key];
      } else if (brush === "note") {
        const t = window.prompt("Заметка на клетке:", cur.t ?? "");
        if (t === null) return prev;
        next[key] = { ...cur, t: t || undefined };
        if (!next[key].m && !next[key].t) delete next[key];
      } else {
        next[key] = { ...cur, m: brush };
      }
      return next;
    });
    setDirty(true);
  }

  async function save() {
    await fetch("/api/bl-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ gridSize: BL_SIZE, cells: marks }),
    });
    setDirty(false);
    setSaved(new Date().toLocaleString("ru-RU"));
  }

  return (
    <div>
      <PageTitle title="Карта BL — планировщик" subtitle="Реальная территория BL. Отмечай атаки, оборону и цели — план общий для офицеров." />

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {BRUSHES.map((b) => (
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
        <button onClick={() => { if (confirm("Очистить весь план (метки)?")) { setMarks({}); setDirty(true); } }} className="text-sm px-3 py-1.5 rounded border border-border text-muted hover:text-foreground">
          Очистить метки
        </button>
        <button onClick={save} disabled={!dirty} className="text-sm px-4 py-1.5 rounded bg-primary-strong text-white disabled:opacity-40">
          Сохранить
        </button>
        <span className="text-xs text-muted">{dirty ? "не сохранено" : saved ? `сохранено: ${saved}` : ""}</span>
      </div>

      <div className="overflow-auto">
        <div
          className="grid gap-px bg-[#3a2c20] p-px rounded select-none touch-none"
          style={{ gridTemplateColumns: `repeat(${BL_SIZE}, 34px)`, width: BL_SIZE * 34 + 2 }}
        >
          {base.flat().map((cell) => {
            const key = `${cell.x}_${cell.y}`;
            const mk = marks[key];
            const poi = cell.poi ? POI_INFO[cell.poi] : null;
            const tint = cell.terrain === "plain" ? FACTION_INFO[cell.faction].tint : "transparent";
            const markColor = mk?.m ? MARK_COLOR[mk.m] : null;
            return (
              <div
                key={key}
                onPointerDown={(e) => { e.preventDefault(); painting.current = true; apply(cell.x, cell.y); }}
                onPointerEnter={() => { if (painting.current && brush !== "note") apply(cell.x, cell.y); }}
                title={`${poi ? POI_INFO[cell.poi!].name + " · " : ""}${FACTION_INFO[cell.faction].name}${mk?.t ? " · " + mk.t : ""}`}
                className="relative flex items-center justify-center text-[13px]"
                style={{
                  width: 34, height: 34,
                  background: TERRAIN_COLOR[cell.terrain],
                  cursor: cell.terrain === "mountain" || cell.terrain === "rift" ? "not-allowed" : "pointer",
                  boxShadow: markColor ? `inset 0 0 0 3px ${markColor}` : undefined,
                }}
              >
                {tint !== "transparent" && (
                  <span className="absolute inset-0" style={{ background: tint }} />
                )}
                {cell.terrain === "fortress" && <span className="relative">🏰</span>}
                {poi && <span className="relative">{poi.icon}</span>}
                {mk?.t && (
                  <span className="absolute bottom-0 inset-x-0 text-[7px] leading-tight text-black font-bold text-center bg-white/70 truncate px-px">
                    {mk.t}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* legend */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-xs text-muted">
        <span>🏰 крепость</span>
        {Object.entries(POI_INFO).filter(([k]) => k !== "start").map(([k, v]) => (
          <span key={k}>{v.icon} {v.name}</span>
        ))}
        <span className="w-3 h-3 inline-block align-middle" style={{ background: TERRAIN_COLOR.mountain }} /> <span>горы</span>
        <span className="w-3 h-3 inline-block align-middle" style={{ background: TERRAIN_COLOR.rift }} /> <span>разлом</span>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1 text-xs text-muted">
        {Object.entries(FACTION_INFO).map(([k, v]) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="w-3 h-3 inline-block rounded-sm" style={{ background: v.tint.replace(/0\.\d+/, "0.9") }} /> {v.name}
          </span>
        ))}
      </div>

      <p className="text-muted text-xs mt-3">
        Клетки гор и разломов — непроходимы. Клик/протаскивание — метки; «Заметка» — клик по клетке. Территория фиксированная; если рельеф не совпал — покажи, поправлю.
      </p>
    </div>
  );
}
