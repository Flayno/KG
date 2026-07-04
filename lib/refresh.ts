// On-demand refresh: when a character/alliance page is viewed, pull fresh data
// from the public kg.dbapp.ru API into our DB. Throttled by `refreshedAt` so we
// don't re-fetch on every reload. Each refresh also records a power snapshot, so
// history charts fill in over time.

import { prisma } from "./prisma";
import { normalizeName } from "./normalize";
import { rateLimited } from "./rateLimit";

const ORIGIN = "https://kg.dbapp.ru/api";
const TTL_MS = 10 * 60 * 1000; // refresh at most once per 10 minutes
const big = (v: unknown) => BigInt(String(v ?? "0").split(".")[0] || "0");
const today = () => new Date().toISOString().slice(0, 10);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type AnyObj = Record<string, any>;

async function getJSON(path: string): Promise<AnyObj | null> {
  return rateLimited(async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(`${ORIGIN}${path}`, {
          headers: { accept: "application/json", "user-agent": "KG-Companion/1.0" },
          cache: "no-store",
        });
        if (res.status === 429 || res.status >= 500) {
          await sleep(1500 * (attempt + 1)); // back off, then retry once
          continue;
        }
        if (!res.ok) return null;
        return await res.json();
      } catch {
        await sleep(500);
      }
    }
    return null;
  });
}

async function ensureFlag(flag: AnyObj | null | undefined) {
  if (!flag?.id) return null;
  await prisma.flag.upsert({
    where: { id: flag.id },
    create: { id: flag.id, code: flag.code ?? "", name: flag.name ?? "", content: flag.content ?? "" },
    update: { code: flag.code ?? "", name: flag.name ?? "", content: flag.content ?? "" },
  });
  return flag.id as number;
}

async function ensureServer(server: AnyObj | null | undefined) {
  if (!server?.id) return null;
  const seg = server.segment;
  if (seg?.cluster?.id) {
    await prisma.cluster.upsert({
      where: { id: seg.cluster.id },
      create: { id: seg.cluster.id, name: seg.cluster.name ?? "", description: seg.cluster.description ?? "" },
      update: { name: seg.cluster.name ?? "", description: seg.cluster.description ?? "" },
    });
  }
  if (seg?.id) {
    await prisma.segment.upsert({
      where: { id: seg.id },
      create: { id: seg.id, season: seg.season ?? 0, name: seg.name ?? "", clusterId: seg.cluster?.id ?? 0 },
      update: { season: seg.season ?? 0, name: seg.name ?? "", clusterId: seg.cluster?.id ?? 0 },
    });
  }
  await prisma.server.upsert({
    where: { id: server.id },
    create: {
      id: server.id, online: !!server.online, closed: !!server.closed, cold: !!server.cold,
      season: server.season ?? 0, segmentId: seg?.id ?? 0,
      openDate: server.openDate ?? null, offlineDate: server.offlineDate ?? null,
    },
    update: {
      online: !!server.online, closed: !!server.closed, cold: !!server.cold,
      season: server.season ?? 0, segmentId: seg?.id ?? 0,
      openDate: server.openDate ?? null, offlineDate: server.offlineDate ?? null,
    },
  });
  return server.id as number;
}

async function ensureAllianceRef(ref: AnyObj | null | undefined, serverId: number) {
  if (!ref?.id) return null;
  await prisma.alliance.upsert({
    where: { id: ref.id },
    create: {
      id: ref.id, name: ref.name ?? "", label: ref.label ?? "", serverId,
      power: 0n, members: 0, maxMembers: 100, deleted: !!ref.deleted,
    },
    update: {}, // don't clobber a fully-imported alliance with a thin ref
  });
  return ref.id as string;
}

async function snapshotCharacter(c: AnyObj) {
  const date = today();
  const existing = await prisma.characterSnapshot.findFirst({
    where: { characterId: c.id, date },
    select: { id: true },
  });
  const data = {
    power: big(c.power), maxPower: big(c.maxPower), level: c.level ?? 0,
    pvpDamage: big(c.pvpDamage), allianceId: c.alliance?.id ?? null,
  };
  if (existing) await prisma.characterSnapshot.update({ where: { id: existing.id }, data });
  else await prisma.characterSnapshot.create({ data: { characterId: c.id, date, ...data } });
}

async function upsertCharacter(c: AnyObj, serverId: number, allianceId: string | null) {
  const flagId = await ensureFlag(c.flag);
  const data = {
    nickname: c.nickname ?? "?", searchName: normalizeName(c.nickname ?? ""), serverId, allianceId,
    power: big(c.power), maxPower: big(c.maxPower), level: c.level ?? 0, active: c.active ?? true,
    flagId, gender: c.gender ?? 0, lastOnline: c.lastOnline ?? null, deleted: !!c.deleted,
    pvpDamage: big(c.pvpDamage), pvpRate: c.pvpRate ?? 0, avatar: c.avatar ?? null,
    // allianceRank only comes from the alliance roster endpoint — keep existing value otherwise
    ...(c.allianceRank != null
      ? { allianceRank: c.allianceRank, allianceRankName: c.allianceRankName ?? null }
      : {}),
    refreshedAt: new Date(),
  };
  await prisma.character.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
  await snapshotCharacter(c);
}

function isFresh(refreshedAt: Date | null | undefined) {
  return !!refreshedAt && Date.now() - refreshedAt.getTime() < TTL_MS;
}

/**
 * Pull the character's FULL power/level history from the source's activity feed
 * and replace our snapshots with it. This gives a real history chart immediately
 * (no waiting for snapshots to accumulate).
 */
async function syncCharacterActivity(id: number, current: AnyObj) {
  const j = await getJSON(`/character/${id}/activity`);
  const powerSeries: AnyObj[] = j?.power ?? [];
  const pvpSeries: AnyObj[] = j?.pvp ?? []; // per-date PvP: rate, pvpDamage, diffDamage

  const allianceId = current.alliance?.id ?? null;
  const byDate = new Map<string, AnyObj>();
  const row = (date: string) => {
    let r = byDate.get(date);
    if (!r) {
      r = {
        characterId: id, date,
        power: 0n, maxPower: 0n, level: 0,
        pvpDamage: 0n, pvpRate: 0, diffDamage: 0n, allianceId,
      };
      byDate.set(date, r);
    }
    return r;
  };

  // power/level history
  for (const p of powerSeries) {
    if (!p?.date) continue;
    const r = row(p.date);
    r.power = big(p.power); r.maxPower = big(p.maxPower); r.level = p.level ?? 0;
  }
  // PvP history (the important bit — real activity per date)
  for (const p of pvpSeries) {
    if (!p?.date) continue;
    const r = row(p.date);
    r.pvpDamage = big(p.pvpDamage); r.pvpRate = p.rate ?? 0; r.diffDamage = big(p.diffDamage);
    if (r.maxPower === 0n && p.maxPower) r.maxPower = big(p.maxPower);
  }
  // today's live values so the series ends at "now"
  const t = row(today());
  t.power = big(current.power); t.maxPower = big(current.maxPower); t.level = current.level ?? 0;
  t.pvpDamage = big(current.pvpDamage);
  if (current.pvpRate) t.pvpRate = current.pvpRate;

  // carry power/level forward onto PvP-only dates that lack it (keeps rows valid)
  const rows = [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
  let lp = 0n, lm = 0n, ll = 0;
  for (const r of rows) {
    if (r.power > 0n) { lp = r.power; lm = r.maxPower; ll = r.level; }
    else if (lp > 0n) { r.power = lp; if (r.maxPower === 0n) r.maxPower = lm; if (!r.level) r.level = ll; }
  }

  await prisma.$transaction([
    prisma.characterSnapshot.deleteMany({ where: { characterId: id } }),
    ...Array.from({ length: Math.ceil(rows.length / 500) }, (_, i) =>
      prisma.characterSnapshot.createMany({ data: rows.slice(i * 500, i * 500 + 500) })
    ),
  ]);
}

/** Store the character's history: past alliance memberships + past nicknames.
 *  Pass `preloaded` (the `history` array from /api/get/character) to avoid a 2nd call. */
export async function syncCharacterHistory(id: number, preloaded?: AnyObj[] | null) {
  let arr: AnyObj[];
  if (preloaded) arr = preloaded;
  else {
    const j = await getJSON(`/character/${id}/history`);
    arr = Array.isArray(j) ? (j as AnyObj[]) : [];
  }

  // alliance memberships (dedupe by uuid, keep latest)
  const byUuid = new Map<string, AnyObj>();
  // past names (dedupe by name, keep latest date)
  const byName = new Map<string, AnyObj>();
  for (const e of arr) {
    const a = e.allianceHistory;
    if (a?.uuid) {
      const prev = byUuid.get(a.uuid);
      if (!prev || (e.date ?? "") > (prev.date ?? "")) {
        byUuid.set(a.uuid, {
          characterId: id, allianceUuid: a.uuid,
          label: a.label ?? "", name: a.name ?? "", date: e.date ?? a.date ?? "",
        });
      }
    }
    if (e?.name) {
      const prev = byName.get(e.name);
      if (!prev || (e.date ?? "") > (prev.date ?? "")) {
        byName.set(e.name, {
          characterId: id, name: e.name, searchName: normalizeName(e.name), date: e.date ?? "",
        });
      }
    }
  }
  const allianceRows = [...byUuid.values()];
  const nameRows = [...byName.values()];
  await prisma.$transaction([
    prisma.characterAllianceLink.deleteMany({ where: { characterId: id } }),
    ...(allianceRows.length ? [prisma.characterAllianceLink.createMany({ data: allianceRows })] : []),
    prisma.characterNameHistory.deleteMany({ where: { characterId: id } }),
    ...(nameRows.length ? [prisma.characterNameHistory.createMany({ data: nameRows })] : []),
    prisma.character.update({ where: { id }, data: { historySyncedAt: new Date() } }),
  ]);
}

/** Refresh a single character from the source. Returns true if it fetched. */
export async function refreshCharacter(id: number, force = false): Promise<boolean> {
  // Throttle on detailSyncedAt (not refreshedAt) — refreshedAt is also set when the
  // character is touched as an alliance member, which must NOT block full detail sync.
  const existing = await prisma.character.findUnique({ where: { id }, select: { detailSyncedAt: true } });
  if (!force && isFresh(existing?.detailSyncedAt)) return false;

  // Official endpoint with update=1 → real-time data pulled from the game by the source.
  const j = await getJSON(`/get/character/${id}?update=1`);
  const c = j?.character;
  if (!c?.id) return false;

  const serverId = (await ensureServer(c.server)) ?? c.serverId;
  const allianceId = await ensureAllianceRef(c.alliance, serverId);
  await upsertCharacter(c, serverId, allianceId);
  await syncCharacterActivity(id, c); // real historical chart from the activity feed
  await syncCharacterHistory(id, j?.history); // history comes inline with the character
  await syncLinked(id); // other characters on the same account
  await prisma.character.update({ where: { id }, data: { detailSyncedAt: new Date() } });
  return true;
}

/** Discover & link the other characters on the same account (shared accountKey). */
async function syncLinked(id: number) {
  const arr = await getJSON(`/character/${id}/linked`);
  const linked = Array.isArray(arr) ? (arr as AnyObj[]) : [];
  for (const m of linked) {
    if (!m?.id || m.id === id) continue;
    try {
      const aId = await ensureAllianceRef(m.alliance, m.serverId);
      await upsertCharacter(m, m.serverId, aId);
    } catch {
      /* server/alliance may be missing for off-grid linked chars — skip */
    }
  }
  const ids = [id, ...linked.map((m) => m.id).filter((x): x is number => !!x)];
  const key = String(Math.min(...ids));
  await prisma.character.updateMany({ where: { id: { in: ids } }, data: { accountKey: key } });
  await applyManualLinks(id); // keep manual "same person" links intact across refreshes
}

/** Unify the account groups containing the given character ids into one accountKey. */
export async function mergeAccounts(ids: number[]) {
  const seeds = await prisma.character.findMany({
    where: { id: { in: ids } },
    select: { id: true, accountKey: true },
  });
  const keys = [...new Set(seeds.map((s) => s.accountKey).filter((x): x is string => !!x))];
  const groupMembers = keys.length
    ? await prisma.character.findMany({ where: { accountKey: { in: keys } }, select: { id: true } })
    : [];
  const allIds = [...new Set([...ids, ...groupMembers.map((m) => m.id)])];
  if (allIds.length === 0) return;
  const key = String(Math.min(...allIds));
  await prisma.character.updateMany({ where: { id: { in: allIds } }, data: { accountKey: key } });
}

/** Re-apply manual "same person" links touching a character (merge their groups). */
export async function applyManualLinks(id: number) {
  const links = await prisma.manualLink.findMany({ where: { OR: [{ a: id }, { b: id }] } });
  for (const l of links) await mergeAccounts([l.a, l.b]);
}

/**
 * Ensure alliance-history links exist for a set of members (so hostile-alliance
 * tags show in a roster without visiting each player). Fetches history only for
 * members that have none yet, with bounded concurrency.
 */
export async function ensureMemberHistories(ids: number[]) {
  if (ids.length === 0) return;
  const have = await prisma.characterAllianceLink.findMany({
    where: { characterId: { in: ids } },
    select: { characterId: true },
    distinct: ["characterId"],
  });
  const haveSet = new Set(have.map((h) => h.characterId));
  const missing = ids.filter((i) => !haveSet.has(i)).slice(0, 60);
  const limit = 6;
  for (let i = 0; i < missing.length; i += limit) {
    await Promise.all(missing.slice(i, i + limit).map((id) => syncCharacterHistory(id).catch(() => {})));
  }
}

/** Refresh an alliance AND every one of its members in one source request. */
export async function refreshAlliance(id: string, force = false): Promise<{ refreshed: boolean; members: number }> {
  const existing = await prisma.alliance.findUnique({ where: { id }, select: { refreshedAt: true } });
  if (!force && isFresh(existing?.refreshedAt)) return { refreshed: false, members: 0 };

  // Official endpoint with update=1 → real-time; alliance is at the top level.
  const a = await getJSON(`/get/alliance/${id}?update=1`);
  if (!a?.id) return { refreshed: false, members: 0 };

  const serverId = a.serverId; // the alliance's server already exists from import
  const members: AnyObj[] = a.members ?? [];
  const memberCount = typeof a.members === "number" ? a.members : (a.membersCount ?? members.length);

  await prisma.alliance.upsert({
    where: { id },
    create: {
      id, name: a.name ?? "", label: a.label ?? "", serverId,
      power: big(a.power), members: memberCount, maxMembers: a.maxMembers ?? 100,
      description: a.description ?? null, logoImage: a.logoImage ?? null,
      techLevel: a.techLevel ?? 0, kvkWins: a.kvkWins ?? 0,
      deleted: !!a.deleted, refreshedAt: new Date(),
    },
    update: {
      name: a.name ?? "", label: a.label ?? "", serverId,
      power: big(a.power), members: memberCount, maxMembers: a.maxMembers ?? 100,
      description: a.description ?? null, logoImage: a.logoImage ?? null,
      techLevel: a.techLevel ?? 0, kvkWins: a.kvkWins ?? 0,
      deleted: !!a.deleted, refreshedAt: new Date(),
    },
  });

  // refresh every member
  for (const m of members) {
    await upsertCharacter(m, m.serverId ?? serverId, id);
  }

  // alliance power snapshot for today
  const date = today();
  const existsSnap = await prisma.allianceSnapshot.findFirst({ where: { allianceId: id, date }, select: { id: true } });
  if (existsSnap) await prisma.allianceSnapshot.update({ where: { id: existsSnap.id }, data: { power: big(a.power), members: memberCount } });
  else await prisma.allianceSnapshot.create({ data: { allianceId: id, date, power: big(a.power), members: memberCount } });

  return { refreshed: true, members: members.length };
}
