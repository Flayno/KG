// Fixed Broken Land (BL) terrain — reconstructed as a cell grid.
// Faction start corners: Earth=top-left, Forest=top-right, Fire=bottom-left, Ice=bottom-right.
// Central fortress + a mountain "diamond" with N/S/E/W passes; rifts along the
// mid-axes divide the four faction quadrants. Data-driven so it's easy to refine.

export const BL_SIZE = 16;

export type Terrain = "plain" | "mountain" | "rift" | "fortress";
export type Faction = "earth" | "forest" | "fire" | "ice";
export type Poi =
  | "start" | "capitol" | "altar" | "jungle" | "goblin" | "pass" | "sanctuary";

export type BlCell = {
  x: number;
  y: number;
  terrain: Terrain;
  faction: Faction;
  poi?: Poi;
};

const C = (BL_SIZE - 1) / 2; // 7.5

function factionOf(x: number, y: number): Faction {
  const left = x < BL_SIZE / 2;
  const top = y < BL_SIZE / 2;
  if (top && left) return "earth";
  if (top && !left) return "forest";
  if (!top && left) return "fire";
  return "ice";
}

// Outer (Lvl 1) POIs near each corner; inner (Lvl 2) POIs inside the diamond.
const CORNER_POIS: { ox: number; oy: number; poi: Poi }[] = [
  { ox: 1, oy: 1, poi: "capitol" },
  { ox: 3, oy: 1, poi: "altar" },
  { ox: 1, oy: 3, poi: "goblin" },
  { ox: 3, oy: 3, poi: "jungle" },
  { ox: 5, oy: 1, poi: "sanctuary" },
  { ox: 1, oy: 5, poi: "sanctuary" },
];
// inner POIs as offsets (dx,dy) from centre, mirrored into all four diagonals
const INNER_POIS: { ox: number; oy: number; poi: Poi }[] = [
  { ox: 3, oy: 3, poi: "capitol" },
  { ox: 4, oy: 2, poi: "altar" },
  { ox: 2, oy: 4, poi: "goblin" },
];

export function generateBlMap(): BlCell[][] {
  const grid: BlCell[][] = [];
  for (let y = 0; y < BL_SIZE; y++) {
    const row: BlCell[] = [];
    for (let x = 0; x < BL_SIZE; x++) {
      const dx = x - C;
      const dy = y - C;
      const dia = Math.abs(dx) + Math.abs(dy);
      const onAxis = x === 7 || x === 8 || y === 7 || y === 8;

      let terrain: Terrain = "plain";
      let poi: Poi | undefined;

      if (dia <= 1.5) {
        terrain = "fortress";
      } else if (dia >= 6 && dia <= 7.5) {
        // the mountain diamond ring; the 4 axis crossings are open passes
        if (onAxis) poi = "pass";
        else terrain = "mountain";
      }

      row.push({ x, y, terrain, faction: factionOf(x, y) });
      if (poi) row[x].poi = poi;
    }
    grid.push(row);
  }

  // inner POIs (Lvl 2) — inside the diamond, mirrored to all four diagonals
  const diag = [
    { sx: -1, sy: -1 }, { sx: 1, sy: -1 }, { sx: -1, sy: 1 }, { sx: 1, sy: 1 },
  ];
  for (const d of diag) {
    for (const p of INNER_POIS) {
      const x = Math.round(C + d.sx * p.ox);
      const y = Math.round(C + d.sy * p.oy);
      const cell = grid[y]?.[x];
      if (cell && cell.terrain === "plain" && !cell.poi) cell.poi = p.poi;
    }
  }

  // faction start = each corner
  grid[0][0].poi = "start";
  grid[0][BL_SIZE - 1].poi = "start";
  grid[BL_SIZE - 1][0].poi = "start";
  grid[BL_SIZE - 1][BL_SIZE - 1].poi = "start";

  // place POIs symmetrically in every quadrant (only on plains)
  const corners = [
    { cx: 0, cy: 0, sx: 1, sy: 1 },
    { cx: BL_SIZE - 1, cy: 0, sx: -1, sy: 1 },
    { cx: 0, cy: BL_SIZE - 1, sx: 1, sy: -1 },
    { cx: BL_SIZE - 1, cy: BL_SIZE - 1, sx: -1, sy: -1 },
  ];
  for (const c of corners) {
    for (const p of CORNER_POIS) {
      const x = c.cx + c.sx * p.ox;
      const y = c.cy + c.sy * p.oy;
      const cell = grid[y]?.[x];
      if (cell && cell.terrain === "plain" && !cell.poi) cell.poi = p.poi;
    }
  }

  return grid;
}

export const FACTION_INFO: Record<Faction, { name: string; tint: string }> = {
  earth: { name: "Земля (Терра)", tint: "rgba(212,180,131,0.18)" },
  forest: { name: "Лес (Зелёный)", tint: "rgba(106,176,76,0.16)" },
  fire: { name: "Огонь (Адское пламя)", tint: "rgba(231,76,60,0.15)" },
  ice: { name: "Лёд (Мороз)", tint: "rgba(77,163,255,0.16)" },
};

export const POI_INFO: Record<Poi, { icon: string; name: string }> = {
  start: { icon: "🚩", name: "Старт фракции" },
  capitol: { icon: "🏛️", name: "Столица (Capitol)" },
  altar: { icon: "🔥", name: "Алтарь пламени" },
  jungle: { icon: "🌲", name: "Эльфийские джунгли" },
  goblin: { icon: "⚗️", name: "Лаборатория гоблинов" },
  pass: { icon: "⛰️", name: "Горный проход" },
  sanctuary: { icon: "🛡️", name: "Святилище" },
};

export const TERRAIN_COLOR: Record<Terrain, string> = {
  plain: "#e3c48d",
  mountain: "#6b4f38",
  rift: "#231c17",
  fortress: "#9c5a2a",
};
