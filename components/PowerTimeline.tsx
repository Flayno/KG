"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as echarts from "echarts";
import type { TooltipComponentFormatterCallbackParams } from "echarts";
import { formatPower, formatNumber } from "@/lib/format";
import { blSeason, seasonNumberAt } from "@/lib/bl";
import { useDictionary, useLocale } from "./LocaleProvider";

export type TimelinePoint = {
  date: string;
  power: string;
  maxPower: string;
  level: number;
  pvpDamage: string;
  pvpRate: number;
  diffDamage: string;
};

type Tab = "power" | "pvp";
type View = "chart" | "table";
type TooltipDisplayParam = {
  axisValueLabel?: string;
  axisValue?: string | number;
  seriesName?: string;
  value?: unknown;
  color?: string;
};

const RU_WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const RU_MON = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const EN_WD = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EN_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAY_MS = 86_400_000;
// Below this visible span (~1 season) switch axis to a labelled tick per day.
const WEEKDAY_ZOOM_MS = 33 * DAY_MS;

const COLORS = {
  current: "#4c9dff",
  historical: "#ff5c8a",
  level: "#46d18a",
  damage: "#ffcf4d",
  rate: "#a394ff",
  text: "#a2a4ba",
  subtle: "#6b6d84",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.14)",
};

export function PowerTimeline({ points }: { points: TimelinePoint[] }) {
  const locale = useLocale();
  const t = useDictionary();
  const [tab, setTab] = useState<Tab>("power");
  const [view, setView] = useState<View>("chart");
  const elRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const dayLevelRef = useRef(false);

  const dates = useMemo(() => points.map((p) => p.date), [points]);

  // Always two lines so the plot height never jumps between zoom levels.
  // Zoomed in → weekday over day; zoomed out → day over month.
  const axisFmt = useCallback((value: number) => {
    const d = new Date(value);
    const weekdays = locale === "en" ? EN_WD : RU_WD;
    const months = locale === "en" ? EN_MON : RU_MON;
    return dayLevelRef.current
      ? `${weekdays[d.getUTCDay()]}\n${d.getUTCDate()}`
      : `${d.getUTCDate()}\n${months[d.getUTCMonth()]}`;
  }, [locale]);

  // Shade each BL active window overlapping the data, on the real time axis
  // (equal-width 3-week bands, rest weeks are real gaps).
  const markArea = useMemo<Record<string, unknown> | undefined>(() => {
    if (dates.length === 0) return undefined;
    const t0 = Date.parse(`${dates[0]}T00:00:00Z`);
    const t1 = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
    const bands: { season: number; start: number; end: number }[] = [];
    for (let n = seasonNumberAt(t0); n <= seasonNumberAt(t1); n++) {
      const { activeStart, activeEnd } = blSeason(n);
      if (activeEnd.getTime() < t0 || activeStart.getTime() > t1) continue;
      bands.push({ season: n, start: activeStart.getTime(), end: activeEnd.getTime() });
    }
    return {
      silent: true,
      itemStyle: { color: "rgba(255,92,108,0.07)" },
      label: { show: true, position: "insideTop" as const, color: COLORS.subtle, fontSize: 10, formatter: (p: { data: { season?: number } }) => (p.data.season ? `BL ${p.data.season}` : "") },
      data: bands.map((b) => [{ xAxis: b.start, season: b.season }, { xAxis: b.end }]),
    };
  }, [dates]);

  // Dashed dividers between the 3 weeks of each active BL season.
  const markLine = useMemo(() => {
    if (dates.length === 0) return undefined;
    const WEEK = 7 * 86_400_000;
    const t0 = Date.parse(`${dates[0]}T00:00:00Z`);
    const t1 = Date.parse(`${dates[dates.length - 1]}T00:00:00Z`);
    const lines: number[] = [];
    for (let n = seasonNumberAt(t0); n <= seasonNumberAt(t1); n++) {
      const base = blSeason(n).activeStart.getTime();
      for (const w of [1, 2]) {
        const t = base + w * WEEK;
        if (t >= t0 && t <= t1) lines.push(t);
      }
    }
    return {
      silent: true,
      symbol: "none" as const,
      lineStyle: { color: "rgba(255,255,255,0.12)", type: "dashed" as const, width: 1 },
      label: { show: false },
      data: lines.map((t) => ({ xAxis: t })),
    };
  }, [dates]);

  const option = useMemo(() => {
    const base = {
      backgroundColor: "transparent",
      textStyle: { color: COLORS.text, fontFamily: "inherit" },
      grid: { top: 28, left: 8, right: 8, bottom: 74, containLabel: true },
      legend: { bottom: 6, textStyle: { color: COLORS.text }, itemWidth: 18, itemHeight: 10 },
      tooltip: {
        trigger: "axis",
        backgroundColor: "#1c1c2a",
        borderColor: "rgba(255,255,255,0.1)",
        textStyle: { color: "#eceef6" },
        formatter: (params: TooltipComponentFormatterCallbackParams) => {
          const arr = (Array.isArray(params) ? params : [params]) as TooltipDisplayParam[];
          const head = arr[0]?.axisValueLabel ?? new Date(arr[0]?.axisValue ?? 0).toISOString().slice(0, 10);
          const lines = arr.map((p) => {
            const n = p.seriesName ?? "";
            const raw = Array.isArray(p.value) ? p.value[1] : p.value;
            const val = n.includes(t.common.pvpIndex) || n.toLowerCase().includes("index") ? Number(raw).toFixed(2)
              : n.includes(t.common.castleLevel) || n.toLowerCase().includes("castle") ? formatNumber(String(raw ?? 0))
              : formatPower(String(raw ?? 0));
            return `<div style="display:flex;gap:8px;align-items:center"><span style="width:8px;height:8px;border-radius:9px;background:${p.color ?? COLORS.text}"></span>${n}<span style="margin-left:auto;font-variant-numeric:tabular-nums;font-weight:600">${val}</span></div>`;
          }).join("");
          return `<div style="font-size:12px;margin-bottom:4px;color:#a2a4ba">${head}</div>${lines}`;
        },
      },
      xAxis: {
        type: "time",
        axisLine: { lineStyle: { color: COLORS.axis } },
        axisLabel: { color: COLORS.subtle, formatter: axisFmt, hideOverlap: true },
      },
      dataZoom: [
        { type: "inside", start: 60, end: 100 },
        {
          type: "slider",
          height: 34,
          bottom: 30,
          borderColor: "transparent",
          backgroundColor: "rgba(255,255,255,0.03)",
          fillerColor: "rgba(124,92,255,0.18)",
          handleStyle: { color: "#7c5cff" },
          moveHandleStyle: { color: "#7c5cff" },
          dataBackground: { lineStyle: { color: COLORS.subtle }, areaStyle: { color: "rgba(163,148,255,0.12)" } },
          selectedDataBackground: { lineStyle: { color: COLORS.rate }, areaStyle: { color: "rgba(163,148,255,0.25)" } },
          textStyle: { color: COLORS.subtle },
        },
      ],
    };

    if (tab === "power") {
      return {
        ...base,
        yAxis: [
          {
            type: "value", name: t.common.battlePower, scale: true, nameTextStyle: { color: COLORS.subtle, align: "left" },
            axisLabel: { color: COLORS.subtle, formatter: (v: number) => formatPower(v) },
            splitLine: { lineStyle: { color: COLORS.grid } },
          },
          {
            type: "value", name: t.common.castleLevel, scale: true, nameTextStyle: { color: COLORS.subtle, align: "right" },
            axisLabel: { color: COLORS.subtle, formatter: (v: number) => formatNumber(Math.round(v)) },
            splitLine: { show: false },
          },
        ],
        series: [
          { name: t.common.currentPower, type: "line", showSymbol: false, smooth: true, lineStyle: { width: 2, color: COLORS.current }, itemStyle: { color: COLORS.current }, markArea, markLine, data: points.map((p) => [p.date, Number(p.power)]) },
          { name: t.common.historicalPower, type: "line", showSymbol: false, smooth: true, lineStyle: { width: 2, color: COLORS.historical }, itemStyle: { color: COLORS.historical }, data: points.map((p) => [p.date, Number(p.maxPower)]) },
          { name: t.common.castleLevel, type: "line", yAxisIndex: 1, showSymbol: false, smooth: true, lineStyle: { width: 2, color: COLORS.level }, itemStyle: { color: COLORS.level }, data: points.map((p) => [p.date, p.level]) },
        ],
      };
    }

    // PvP tab
    return {
      ...base,
      yAxis: [
        {
          type: "value", name: t.common.pvpDailyDamage, scale: true, nameTextStyle: { color: COLORS.subtle, align: "left" },
          axisLabel: { color: COLORS.subtle, formatter: (v: number) => formatPower(v) },
          splitLine: { lineStyle: { color: COLORS.grid } },
        },
        {
          type: "value", name: t.common.pvpIndex, scale: true, nameTextStyle: { color: COLORS.subtle, align: "right" },
          axisLabel: { color: COLORS.subtle },
          splitLine: { show: false },
        },
      ],
      series: [
        { name: t.common.pvpDailyDamage, type: "bar", itemStyle: { color: COLORS.damage, borderRadius: [2, 2, 0, 0] }, markArea, markLine, data: points.map((p) => [p.date, Number(p.diffDamage)]) },
        { name: t.common.pvpIndex, type: "line", yAxisIndex: 1, showSymbol: false, smooth: true, lineStyle: { width: 2, color: COLORS.rate }, itemStyle: { color: COLORS.rate }, data: points.map((p) => [p.date, p.pvpRate]) },
      ],
    };
  }, [tab, points, markArea, markLine, axisFmt, t]);

  useEffect(() => {
    if (view !== "chart" || !elRef.current) return;
    const chart = chartRef.current ?? echarts.init(elRef.current, undefined, { renderer: "canvas" });
    chartRef.current = chart;
    chart.setOption(option as echarts.EChartsOption, true);

    const t0 = dates.length ? Date.parse(`${dates[0]}T00:00:00Z`) : 0;
    const t1 = dates.length ? Date.parse(`${dates[dates.length - 1]}T00:00:00Z`) : 0;
    const onZoom = () => {
      const dz = (chart.getOption().dataZoom as { start: number; end: number }[] | undefined)?.[0];
      if (!dz) return;
      const span = (t1 - t0) * ((dz.end - dz.start) / 100);
      const mode = span > 0 && span <= WEEKDAY_ZOOM_MS;
      if (mode !== dayLevelRef.current) {
        dayLevelRef.current = mode;
        // Day mode: force a tick every day and label all of them. Wide: auto.
        chart.setOption({
          xAxis: {
            minInterval: mode ? DAY_MS : null,
            maxInterval: mode ? DAY_MS : null,
            axisLabel: { formatter: axisFmt, interval: mode ? 0 : "auto", hideOverlap: !mode },
          },
        } as unknown as echarts.EChartsOption);
      }
    };
    chart.on("datazoom", onZoom);
    onZoom();

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(elRef.current);
    return () => { chart.off("datazoom", onZoom); ro.disconnect(); };
  }, [option, view, dates, axisFmt]);

  useEffect(() => () => { chartRef.current?.dispose(); chartRef.current = null; }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="inline-flex rounded-lg bg-surface-2 p-0.5">
          <TabBtn active={tab === "power"} onClick={() => setTab("power")}>{t.common.powerHistory}</TabBtn>
          <TabBtn active={tab === "pvp"} onClick={() => setTab("pvp")}>{t.common.pvpActivity}</TabBtn>
        </div>
        <div className="inline-flex rounded-lg bg-surface-2 p-0.5">
          <IconBtn active={view === "chart"} onClick={() => setView("chart")} label={t.common.chart}>
            <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
          </IconBtn>
          <IconBtn active={view === "table"} onClick={() => setView("table")} label={t.common.table}>
            <path d="M3 3h18v18H3z" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </IconBtn>
        </div>
      </div>

      {view === "chart" ? (
        <div ref={elRef} className="w-full" style={{ height: 380 }} />
      ) : (
        <TimelineTable points={points} tab={tab} />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${active ? "bg-elevated text-foreground" : "text-muted hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function IconBtn({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`px-2.5 py-1.5 rounded-md transition-colors cursor-pointer ${active ? "bg-elevated text-foreground" : "text-muted hover:text-foreground"}`}
    >
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
    </button>
  );
}

function TimelineTable({ points, tab }: { points: TimelinePoint[]; tab: Tab }) {
  const t = useDictionary();
  const rows = [...points].reverse();
  return (
    <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface">
          <tr className="text-subtle text-[11px] uppercase tracking-wider text-left [&>th]:py-2 [&>th]:px-2 [&>th]:border-b [&>th]:border-border">
            <th>{t.common.date}</th>
            {tab === "power" ? (
              <>
                <th className="text-right">{t.common.currentPower}</th>
                <th className="text-right">{t.common.historical}</th>
                <th className="text-right">{t.common.level}</th>
              </>
            ) : (
              <>
                <th className="text-right">{t.common.pvpDailyDamage}</th>
                <th className="text-right">{t.common.pvpIndex}</th>
              </>
            )}
          </tr>
        </thead>
        <tbody className="[&>tr>td]:py-1.5 [&>tr>td]:px-2 [&>tr>td]:border-b [&>tr>td]:border-white/[0.04]">
          {rows.map((r) => (
            <tr key={r.date} className="hover:bg-white/[0.03]">
              <td className="tabular-nums">{r.date}</td>
              {tab === "power" ? (
                <>
                  <td className="text-right tabular-nums">{formatPower(r.power)}</td>
                  <td className="text-right tabular-nums text-muted">{formatPower(r.maxPower)}</td>
                  <td className="text-right tabular-nums text-muted">{formatNumber(r.level)}</td>
                </>
              ) : (
                <>
                  <td className="text-right tabular-nums text-success">{Number(r.diffDamage) > 0 ? `+${formatPower(r.diffDamage)}` : t.common.emptyDash}</td>
                  <td className="text-right tabular-nums">{r.pvpRate.toFixed(2)}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
