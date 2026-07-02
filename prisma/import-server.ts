/**
 * Bulk importer: pulls an ENTIRE server (all alliances + all tracked characters)
 * from the public kg.dbapp.ru API into our local DB. No game login, read-only.
 *
 * Usage: npx tsx prisma/import-server.ts <serverId> [serverId...]
 *        npm run db:import-server 913
 */
import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../lib/normalize";

const prisma = new PrismaClient();
const BASE = "https://kg.dbapp.ru/api";
const big = (v: unknown) => BigInt(String(v ?? "0").split(".")[0] || "0");
type AnyObj = Record<string, any>;

async function getJSON(path: string): Promise<AnyObj> {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
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

async function ensureServer(server: AnyObj) {
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

async function upsertAlliance(a: AnyObj, serverId: number) {
  const members = typeof a.members === "number" ? a.members : (a.membersCount ?? (Array.isArray(a.members) ? a.members.length : 0));
  await prisma.alliance.upsert({
    where: { id: a.id },
    create: {
      id: a.id, name: a.name ?? "", label: a.label ?? "", serverId: a.serverId ?? serverId,
      power: big(a.power), members, maxMembers: a.maxMembers ?? 100, deleted: !!a.deleted,
    },
    update: {
      name: a.name ?? "", label: a.label ?? "", serverId: a.serverId ?? serverId,
      power: big(a.power), members, maxMembers: a.maxMembers ?? 100, deleted: !!a.deleted,
    },
  });
}

async function importServer(serverId: number) {
  console.log(`\n=== importing server #${serverId} ===`);
  const sj = await getJSON(`/server/${serverId}`);
  const server = sj.server ?? sj;
  await ensureServer(server);

  // 1) alliances
  const aj = await getJSON(`/server/${serverId}/alliances`);
  const alliances: AnyObj[] = aj.alliances ?? [];
  console.log(`  alliances: ${alliances.length}`);
  const known = new Set<string>();
  for (const a of alliances) {
    await upsertAlliance(a, serverId);
    known.add(a.id);
  }

  // 2) characters
  const cj = await getJSON(`/server/${serverId}/characters`);
  const chars: AnyObj[] = cj.characters ?? [];
  console.log(`  characters: ${chars.length}`);

  // Create stub alliances for any referenced but missing alliance.
  for (const c of chars) {
    const ref = c.alliance;
    if (ref?.id && !known.has(ref.id)) {
      await upsertAlliance(
        { id: ref.id, name: ref.name ?? "", label: ref.label ?? "", serverId, power: 0, members: 0, deleted: !!ref.deleted },
        serverId
      );
      known.add(ref.id);
    }
  }

  let n = 0;
  for (const c of chars) {
    const flagId = await ensureFlag(c.flag);
    const data = {
      nickname: c.nickname ?? "?", searchName: normalizeName(c.nickname ?? ""), serverId: c.serverId ?? serverId, allianceId: c.alliance?.id ?? null,
      power: big(c.power), maxPower: big(c.maxPower), level: c.level ?? 0, active: c.active ?? true,
      flagId, gender: c.gender ?? 0, lastOnline: c.lastOnline ?? null, deleted: !!c.deleted,
      pvpDamage: big(c.pvpDamage), pvpRate: c.pvpRate ?? 0, avatar: c.avatar ?? null,
    };
    await prisma.character.upsert({ where: { id: c.id }, create: { id: c.id, ...data }, update: data });
    n++;
  }
  console.log(`  ✓ imported ${alliances.length} alliances, ${n} characters for server #${serverId}`);
}

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(Boolean);
  if (ids.length === 0) {
    console.error("Usage: npx tsx prisma/import-server.ts <serverId> [more...]");
    process.exit(1);
  }
  for (const id of ids) {
    try { await importServer(id); } catch (e) { console.error(`  ✗ server ${id}:`, (e as Error).message); }
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
