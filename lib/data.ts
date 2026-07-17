// Shared data-access layer. Used by both the /api routes and the server-rendered
// pages so the UI and the public API return identical shapes.

import { prisma } from "./prisma";
import { normalizeName } from "./normalize";
import { seasonActiveDateRange } from "./bl";
import {
  characterDTO,
  allianceDTO,
  serverDTO,
  clusterDTO,
  flagDTO,
} from "./serialize";
import { refreshCharacter } from "./refresh";

const serverInclude = { segment: { include: { cluster: true } } } as const;

export async function getClusters() {
  const clusters = await prisma.cluster.findMany({ orderBy: { id: "desc" } });
  return clusters.map(clusterDTO);
}

export async function getRatingsMeta() {
  const [clusters, flags] = await Promise.all([
    prisma.cluster.findMany({ orderBy: { id: "asc" } }),
    prisma.flag.findMany({ orderBy: { id: "asc" } }),
  ]);
  return { clusters: clusters.map(clusterDTO), flags: flags.map(flagDTO) };
}

export type RatingQuery = {
  clusterId?: number;
  serverId?: number;
  search?: string;
  limit?: number;
  offset?: number;
};

export async function getCharacterRatings(q: RatingQuery = {}) {
  const where: Record<string, unknown> = { deleted: false };
  if (q.serverId) where.serverId = q.serverId;
  if (q.clusterId)
    where.server = { segment: { clusterId: q.clusterId } };
  if (q.search) where.nickname = { contains: q.search };

  const characters = await prisma.character.findMany({
    where,
    include: { flag: true, alliance: true, server: { include: serverInclude } },
    orderBy: { maxPower: "desc" }, // historical (peak) power
    take: q.limit ?? 100,
    skip: q.offset ?? 0,
  });
  return { characters: characters.map((c) => characterDTO(c, { server: true })) };
}

export async function getAllianceRatings(q: RatingQuery = {}) {
  const where: Record<string, unknown> = { deleted: false };
  if (q.serverId) where.serverId = q.serverId;
  if (q.clusterId) where.server = { segment: { clusterId: q.clusterId } };
  if (q.search) where.label = { contains: q.search };

  const alliances = await prisma.alliance.findMany({
    where,
    include: { server: { include: serverInclude } },
    orderBy: { power: "desc" },
    take: q.limit ?? 100,
    skip: q.offset ?? 0,
  });
  const blSet = await blacklistedAllianceIds();
  return {
    alliances: alliances.map((a) => ({ ...allianceDTO(a), hasBlacklisted: blSet.has(a.id) })),
  };
}

export async function getClusterServers(clusterId: number) {
  const servers = await prisma.server.findMany({
    where: { segment: { clusterId } },
    include: serverInclude,
    orderBy: { id: "asc" },
  });
  return servers.map(serverDTO);
}

export async function getServer(id: number) {
  const server = await prisma.server.findUnique({
    where: { id },
    include: serverInclude,
  });
  if (!server) return null;
  let kingChar: { id: number; nickname: string } | null = null;
  if (server.kingId) {
    const k = await prisma.character.findUnique({
      where: { id: server.kingId },
      select: { id: true, nickname: true },
    });
    if (k) kingChar = k;
  }
  return { ...serverDTO(server), kingChar };
}

export async function getServerCharacters(id: number) {
  const characters = await prisma.character.findMany({
    where: { serverId: id, deleted: false },
    include: { flag: true, alliance: true },
    orderBy: { maxPower: "desc" }, // historical (peak) power
  });
  return { characters: characters.map((c) => characterDTO(c)) };
}

export async function getServerAlliances(id: number) {
  const alliances = await prisma.alliance.findMany({
    where: { serverId: id, deleted: false },
    orderBy: { power: "desc" },
  });
  const blSet = await blacklistedAllianceIds();
  return {
    alliances: alliances.map((a) => ({ ...allianceDTO(a), hasBlacklisted: blSet.has(a.id) })),
  };
}

export async function getCharacter(id: number) {
  const c = await prisma.character.findUnique({
    where: { id },
    include: { flag: true, alliance: true, server: { include: serverInclude } },
  });
  return c ? characterDTO(c, { server: true }) : null;
}

export async function getCharacterHistory(id: number) {
  const snaps = await prisma.characterSnapshot.findMany({
    where: { characterId: id },
    orderBy: { date: "asc" },
  });
  return {
    history: snaps.map((s) => ({
      date: s.date,
      power: s.power.toString(),
      maxPower: s.maxPower.toString(),
      level: s.level,
      pvpDamage: s.pvpDamage.toString(),
      pvpRate: s.pvpRate,
      diffDamage: s.diffDamage.toString(),
    })),
  };
}

export async function getAlliance(id: string) {
  const a = await prisma.alliance.findUnique({
    where: { id },
    include: { server: { include: serverInclude } },
  });
  if (!a) return null;
  const blCount = await prisma.character.count({ where: { allianceId: id, blacklisted: true } });
  return { ...allianceDTO(a), hasBlacklisted: blCount > 0 };
}

export async function getAllianceMembers(id: string) {
  const characters = await prisma.character.findMany({
    where: { allianceId: id, deleted: false },
    include: { flag: true, alliance: true },
    orderBy: [{ allianceRank: "desc" }, { maxPower: "desc" }], // R5 first, then by power
  });
  return { characters: characters.map((c) => characterDTO(c)) };
}

/**
 * PvP damage each character dealt in the last `days` days (sum of per-date
 * diffDamage from snapshots) — a real "recent PvP activity" signal.
 */
/** PvP damage each character dealt during a BL season's active window. */
export async function getSeasonPvpDamage(ids: number[], season: number): Promise<Map<number, bigint>> {
  const result = new Map<number, bigint>();
  if (ids.length === 0) return result;
  const { gte, lt } = seasonActiveDateRange(season);
  const rows = await prisma.characterSnapshot.groupBy({
    by: ["characterId"],
    where: { characterId: { in: ids }, date: { gte, lt } },
    _sum: { diffDamage: true },
  });
  for (const r of rows) result.set(r.characterId, r._sum.diffDamage ?? 0n);
  return result;
}

/** Set of alliance ids that currently have at least one blacklisted member. */
export async function blacklistedAllianceIds(): Promise<Set<string>> {
  const rows = await prisma.character.findMany({
    where: { blacklisted: true, allianceId: { not: null } },
    select: { allianceId: true },
    distinct: ["allianceId"],
  });
  return new Set(rows.map((r) => r.allianceId).filter((x): x is string => !!x));
}

type Tag = { id: string; label: string; name: string };

/**
 * Map of characterId -> hostile alliances they (or any character on the same
 * account) were EVER in. Tags are shared across all characters of an account.
 */
export async function getHostileTagsFor(ids: number[]): Promise<Map<number, Tag[]>> {
  const result = new Map<number, Tag[]>();
  if (ids.length === 0) return result;
  const hostile = await prisma.alliance.findMany({ where: { hostile: true }, select: { id: true } });
  const hset = hostile.map((a) => a.id);
  if (hset.length === 0) return result;

  // group each character by its account (or itself if unlinked)
  const reqChars = await prisma.character.findMany({
    where: { id: { in: ids } },
    select: { id: true, accountKey: true },
  });
  const accountKeys = [...new Set(reqChars.map((c) => c.accountKey).filter((x): x is string => !!x))];
  const accChars = accountKeys.length
    ? await prisma.character.findMany({ where: { accountKey: { in: accountKeys } }, select: { id: true, accountKey: true } })
    : [];

  const groupOf = new Map<number, string>();
  for (const c of reqChars) groupOf.set(c.id, c.accountKey ?? `self:${c.id}`);
  for (const c of accChars) groupOf.set(c.id, c.accountKey!);

  const links = await prisma.characterAllianceLink.findMany({
    where: { characterId: { in: [...groupOf.keys()] }, allianceUuid: { in: hset } },
  });

  const byGroup = new Map<string, Map<string, Tag>>();
  for (const l of links) {
    const g = groupOf.get(l.characterId);
    if (!g) continue;
    const m = byGroup.get(g) ?? new Map<string, Tag>();
    m.set(l.allianceUuid, { id: l.allianceUuid, label: l.label, name: l.name });
    byGroup.set(g, m);
  }
  for (const c of reqChars) {
    const m = byGroup.get(c.accountKey ?? `self:${c.id}`);
    if (m) result.set(c.id, [...m.values()]);
  }
  return result;
}

export async function getHostileTags(id: number) {
  return (await getHostileTagsFor([id])).get(id) ?? [];
}

/**
 * Former members of an alliance: characters whose history includes this alliance
 * but who are NOT currently in it (left to another alliance or none).
 * Known only for characters we've synced — grows as more players are viewed.
 */
export async function getFormerMembers(allianceId: string) {
  const links = await prisma.characterAllianceLink.findMany({
    where: { allianceUuid: allianceId },
    select: { characterId: true },
  });
  const ids = [...new Set(links.map((l) => l.characterId))];
  if (ids.length === 0) return [];
  const chars = await prisma.character.findMany({
    where: {
      id: { in: ids },
      deleted: false,
      OR: [{ allianceId: null }, { allianceId: { not: allianceId } }],
    },
    include: { flag: true, alliance: true },
    orderBy: { maxPower: "desc" },
  });
  return chars.map((c) => characterDTO(c));
}

export async function getFormerCount(allianceId: string) {
  const links = await prisma.characterAllianceLink.findMany({
    where: { allianceUuid: allianceId },
    select: { characterId: true },
  });
  const ids = [...new Set(links.map((l) => l.characterId))];
  if (ids.length === 0) return 0;
  return prisma.character.count({
    where: {
      id: { in: ids },
      deleted: false,
      OR: [{ allianceId: null }, { allianceId: { not: allianceId } }],
    },
  });
}

/** All in-game characters on the same account (incl. self), strongest first. */
export async function getAccountCharacters(id: number) {
  const me = await prisma.character.findUnique({ where: { id }, select: { accountKey: true } });
  const where = me?.accountKey ? { accountKey: me.accountKey } : { id };
  const chars = await prisma.character.findMany({
    where,
    include: { flag: true, alliance: true },
    orderBy: { maxPower: "desc" },
  });
  return chars.map((c) => characterDTO(c));
}

/** How many characters are on this character's account (for the tab badge). */
export async function getAccountCount(id: number) {
  const me = await prisma.character.findUnique({ where: { id }, select: { accountKey: true } });
  if (!me?.accountKey) return 1;
  return prisma.character.count({ where: { accountKey: me.accountKey } });
}

export async function getBlacklist() {
  const chars = await prisma.character.findMany({
    where: { blacklisted: true },
    include: { flag: true, alliance: true },
    orderBy: { maxPower: "desc" },
  });
  return chars.map((c) => characterDTO(c));
}

export async function getAllianceHistory(id: string) {
  const snaps = await prisma.allianceSnapshot.findMany({
    where: { allianceId: id },
    orderBy: { date: "asc" },
  });
  return {
    history: snaps.map((s) => ({
      date: s.date,
      power: s.power.toString(),
      members: s.members,
    })),
  };
}

function parseCharacterId(search: string): number | null {
  const normalized = search.trim().replace(/^#/, "");
  if (!/^\d+$/.test(normalized)) return null;
  const id = Number(normalized);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function searchCharacters(search: string) {
  const q = normalizeName(search);
  if (!q) return [];
  const exactId = parseCharacterId(search);

  if (exactId) {
    await refreshCharacter(exactId).catch(() => false);
  }

  const exactHit = exactId
    ? await prisma.character.findFirst({
        where: { id: exactId, deleted: false },
        include: { flag: true, alliance: true },
      })
    : null;

  // matches by a former nickname -> characterId + the matched old name
  const nameHits = await prisma.characterNameHistory.findMany({
    where: { searchName: { contains: q } },
    select: { characterId: true, name: true, date: true },
    orderBy: { date: "desc" },
  });
  const aliasByChar = new Map<number, string>();
  const hitIds: number[] = [];
  for (const h of nameHits) {
    if (!aliasByChar.has(h.characterId)) {
      aliasByChar.set(h.characterId, h.name);
      hitIds.push(h.characterId);
    }
  }

  const chars = await prisma.character.findMany({
    where: {
      deleted: false,
      ...(exactId ? { id: { not: exactId } } : {}),
      OR: [{ searchName: { contains: q } }, { id: { in: hitIds } }],
    },
    include: { flag: true, alliance: true },
    orderBy: { maxPower: "desc" },
    take: exactHit ? 19 : 20,
  });

  return [exactHit, ...chars].filter((c): c is NonNullable<typeof c> => !!c).map((c) => {
    const dto = characterDTO(c);
    const alias = aliasByChar.get(c.id);
    // show the matched old name in parens when it differs from the current one
    return { ...dto, alias: alias && alias !== c.nickname ? alias : undefined };
  });
}

export async function searchAlliances(search: string) {
  if (!search) return [];
  const alliances = await prisma.alliance.findMany({
    where: { label: { contains: search }, deleted: false },
    include: { server: { include: serverInclude } },
    orderBy: { power: "desc" },
    take: 20,
  });
  return alliances.map(allianceDTO);
}
