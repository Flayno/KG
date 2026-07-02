// Helpers to shape DB rows into the JSON shapes the original kg.dbapp.ru API returns.
// Big in-game numbers are returned as strings (matching the original).

import type {
  Character,
  Alliance,
  Server,
  Segment,
  Cluster,
  Flag,
} from "@prisma/client";

export type FlagDTO = {
  id: number;
  code: string;
  name: string;
  content: string;
};

export function flagDTO(flag: Flag | null | undefined): FlagDTO | null {
  if (!flag) return null;
  return { id: flag.id, code: flag.code, name: flag.name, content: flag.content };
}

export function clusterDTO(c: Cluster) {
  return { id: c.id, name: c.name, description: c.description };
}

export function segmentDTO(s: Segment & { cluster?: Cluster | null }) {
  return {
    id: s.id,
    season: s.season,
    name: s.name,
    cluster: s.cluster ? clusterDTO(s.cluster) : null,
  };
}

export function serverDTO(
  s: Server & { segment?: (Segment & { cluster?: Cluster | null }) | null }
) {
  return {
    id: s.id,
    online: s.online,
    closed: s.closed,
    cold: s.cold,
    season: s.season,
    segment: s.segment ? segmentDTO(s.segment) : null,
    openDate: s.openDate,
    offlineDate: s.offlineDate,
    king: s.kingId ?? null,
  };
}

export function allianceRefDTO(a: Alliance | null | undefined) {
  if (!a) return null;
  return { name: a.name, label: a.label, deleted: a.deleted, id: a.id };
}

export function allianceDTO(
  a: Alliance & {
    server?: (Server & { segment?: (Segment & { cluster?: Cluster | null }) | null }) | null;
  }
) {
  return {
    id: a.id,
    name: a.name,
    label: a.label,
    serverId: a.serverId,
    server: a.server ? serverDTO(a.server) : undefined,
    power: a.power.toString(),
    members: a.members,
    maxMembers: a.maxMembers,
    description: a.description ?? null,
    logoImage: a.logoImage ?? null,
    techLevel: a.techLevel ?? 0,
    kvkWins: a.kvkWins ?? 0,
    hostile: a.hostile ?? false,
    hostileReason: a.hostileReason ?? null,
    deleted: a.deleted,
    refreshedAt: a.refreshedAt ? a.refreshedAt.toISOString() : null,
  };
}

type CharacterWithRels = Character & {
  flag?: Flag | null;
  alliance?: Alliance | null;
  server?:
    | (Server & { segment?: (Segment & { cluster?: Cluster | null }) | null })
    | null;
};

function daysSince(date: string | null): number {
  if (!date) return 0;
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function characterDTO(c: CharacterWithRels, opts: { server?: boolean } = {}) {
  return {
    id: c.id,
    nickname: c.nickname,
    serverId: c.serverId,
    ...(opts.server && c.server ? { server: serverDTO(c.server) } : {}),
    power: c.power.toString(),
    maxPower: c.maxPower.toString(),
    level: c.level,
    active: c.active,
    flag: flagDTO(c.flag),
    gender: c.gender,
    alliance: allianceRefDTO(c.alliance),
    lastOnline: c.lastOnline,
    deleted: c.deleted,
    pvpDamage: c.pvpDamage.toString(),
    pvpRate: c.pvpRate,
    avatar: c.avatar,
    allianceRank: c.allianceRank ?? null,
    allianceRankName: c.allianceRankName ?? null,
    blacklisted: c.blacklisted ?? false,
    blacklistReason: c.blacklistReason ?? null,
    lastOnlineDays: daysSince(c.lastOnline),
    refreshedAt: c.refreshedAt ? c.refreshedAt.toISOString() : null,
  };
}

/** Recursively convert any BigInt values to strings for JSON responses. */
export function jsonSafe<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_k, v) => (typeof v === "bigint" ? v.toString() : v))
  );
}
