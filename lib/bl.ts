// BL — "Огненная экспедиция" (Fire Expedition), the game's flagship PvP event.
// Cycle = 4 weeks: 3 weeks ACTIVE + 1 week REST. All boundaries at 00:00 UTC Monday.
// Anchor: season 58 active starts Mon 2026-06-15 00:00 UTC (ends Mon 2026-07-06).

const DAY = 86_400_000;
const WEEK = 7 * DAY;
export const BL_CYCLE = 4 * WEEK;
export const BL_ACTIVE = 3 * WEEK;

const ANCHOR_SEASON = 58;
const ANCHOR_START = Date.UTC(2026, 5, 15); // 2026-06-15 00:00 UTC (Monday)

export type BLSeason = {
  season: number;
  activeStart: Date; // inclusive
  activeEnd: Date; // exclusive — also the start of the rest week
  restEnd: Date; // exclusive — also the start of the next season
};

export function seasonStartMs(season: number): number {
  return ANCHOR_START + (season - ANCHOR_SEASON) * BL_CYCLE;
}

export function blSeason(season: number): BLSeason {
  const s = seasonStartMs(season);
  return {
    season,
    activeStart: new Date(s),
    activeEnd: new Date(s + BL_ACTIVE),
    restEnd: new Date(s + BL_CYCLE),
  };
}

/** Season number whose 4-week cycle (active + its trailing rest) contains `t`. */
export function seasonNumberAt(t: number | Date = Date.now()): number {
  const ms = typeof t === "number" ? t : t.getTime();
  return ANCHOR_SEASON + Math.floor((ms - ANCHOR_START) / BL_CYCLE);
}

export type BLStatus = {
  season: number;
  phase: "active" | "rest";
  msToNext: number; // until phase boundary (active→rest, or rest→next active)
  nextSeason: number;
};

export function blStatus(now: number | Date = Date.now()): BLStatus {
  const ms = typeof now === "number" ? now : now.getTime();
  const season = seasonNumberAt(ms);
  const { activeEnd, restEnd } = blSeason(season);
  const active = ms < activeEnd.getTime();
  return {
    season,
    phase: active ? "active" : "rest",
    msToNext: (active ? activeEnd.getTime() : restEnd.getTime()) - ms,
    nextSeason: season + 1,
  };
}

/** YYYY-MM-DD half-open range of a season's ACTIVE phase — for summing daily snapshots. */
export function seasonActiveDateRange(season: number): { gte: string; lt: string } {
  const { activeStart, activeEnd } = blSeason(season);
  return {
    gte: activeStart.toISOString().slice(0, 10),
    lt: activeEnd.toISOString().slice(0, 10),
  };
}

export function formatDaysLeft(ms: number): string {
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3_600_000);
  if (d > 0) return `${d} дн ${h} ч`;
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return `${h} ч ${m} мин`;
}
