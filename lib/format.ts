// Display helpers for in-game numbers.
import type { Locale } from "./i18n";

const UNITS = [
  { v: 1e15, s: "Q" },
  { v: 1e12, s: "T" },
  { v: 1e9, s: "B" },
  { v: 1e6, s: "M" },
  { v: 1e3, s: "K" },
];

/** 1432596128965554 -> "1.43Q" */
export function formatPower(value: string | number | bigint): string {
  const n = typeof value === "bigint" ? Number(value) : Number(value);
  if (!isFinite(n)) return "0";
  for (const u of UNITS) {
    if (Math.abs(n) >= u.v) {
      const x = n / u.v;
      return `${x >= 100 ? x.toFixed(0) : x.toFixed(2)}${u.s}`;
    }
  }
  return n.toLocaleString("en-US");
}

/** 52886 -> "52,886" */
export function formatNumber(value: string | number): string {
  return Number(value).toLocaleString("en-US");
}

export function formatDate(d: string | null | undefined): string {
  if (!d) return "—";
  return d;
}

export function relativeOnline(days: number, locale: Locale = "ru"): string {
  if (days <= 0) return locale === "en" ? "today" : "сегодня";
  if (days === 1) return locale === "en" ? "1 day ago" : "1 день назад";
  return locale === "en" ? `${days} days ago` : `${days} дн. назад`;
}

export function relativeTime(iso?: string | null, locale: Locale = "ru"): string {
  if (!iso) return "";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return locale === "en" ? "just now" : "только что";
  if (m < 60) return locale === "en" ? `${m} min ago` : `${m} мин назад`;
  const h = Math.floor(m / 60);
  if (h < 24) return locale === "en" ? `${h} h ago` : `${h} ч назад`;
  const d = Math.floor(h / 24);
  return locale === "en" ? `${d} d ago` : `${d} дн назад`;
}
