/**
 * One-off importer: pulls a REAL character (and their alliance + roster + server)
 * from the public kg.dbapp.ru API into our local DB.
 *
 * Usage: npx tsx prisma/import.ts <characterId> [characterId...]
 *
 * This is a stop-gap so you can see real entities in the local clone. The proper
 * Phase 2 collector will pull from the game itself, not from kg.dbapp.ru.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../lib/normalize";

const prisma = new PrismaClient();
const BASE = "https://kg.dbapp.ru/api";

const big = (v: unknown) => BigInt(String(v ?? "0").split(".")[0] || "0");

type AnyObj = Record<string, any>;

async function getJSON(path: string): Promise<AnyObj> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { accept: "application/json" },
  });
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
      id: server.id,
      online: !!server.online,
      closed: !!server.closed,
      cold: !!server.cold,
      season: server.season ?? 0,
      segmentId: seg?.id ?? 0,
      openDate: server.openDate ?? null,
      offlineDate: server.offlineDate ?? null,
    },
    update: {
      online: !!server.online,
      closed: !!server.closed,
      cold: !!server.cold,
      season: server.season ?? 0,
      segmentId: seg?.id ?? 0,
      openDate: server.openDate ?? null,
      offlineDate: server.offlineDate ?? null,
    },
  });
  return server.id as number;
}

async function upsertCharacter(c: AnyObj, serverId: number, allianceId: string | null) {
  const flagId = await ensureFlag(c.flag);
  const data = {
    nickname: c.nickname ?? "?",
    searchName: normalizeName(c.nickname ?? ""),
    serverId,
    allianceId,
    power: big(c.power),
    maxPower: big(c.maxPower),
    level: c.level ?? 0,
    active: c.active ?? true,
    flagId,
    gender: c.gender ?? 0,
    lastOnline: c.lastOnline ?? null,
    deleted: !!c.deleted,
    pvpDamage: big(c.pvpDamage),
    pvpRate: c.pvpRate ?? 0,
    avatar: c.avatar ?? null,
  };
  await prisma.character.upsert({
    where: { id: c.id },
    create: { id: c.id, ...data },
    update: data,
  });
}

async function importCharacter(id: number) {
  console.log(`\n→ importing character ${id}`);
  const cj = await getJSON(`/character/${id}`);
  const c = cj.character ?? cj;
  if (!c?.id) throw new Error("no character in response");

  const serverId = await ensureServer(c.server);

  let allianceId: string | null = null;
  if (c.alliance?.id) {
    allianceId = c.alliance.id;
    const aj = await getJSON(`/alliance/${allianceId}`);
    const a = aj.alliance ?? aj;
    // Make sure the alliance's server exists too (usually the same).
    if (aj.server) await ensureServer(aj.server);
    await prisma.alliance.upsert({
      where: { id: a.id ?? allianceId },
      create: {
        id: a.id ?? allianceId!,
        name: a.name ?? "",
        label: a.label ?? "",
        serverId: a.serverId ?? serverId,
        power: big(a.power),
        members: a.membersCount ?? (a.members?.length ?? 0),
        maxMembers: a.maxMembers ?? 100,
        deleted: !!a.deleted,
      },
      update: {
        name: a.name ?? "",
        label: a.label ?? "",
        serverId: a.serverId ?? serverId,
        power: big(a.power),
        members: a.membersCount ?? (a.members?.length ?? 0),
        maxMembers: a.maxMembers ?? 100,
        deleted: !!a.deleted,
      },
    });

    const roster: AnyObj[] = a.members ?? [];
    console.log(`  alliance [${a.label}] ${a.name}: ${roster.length} members`);
    for (const m of roster) {
      await ensureServer({ id: m.serverId ?? serverId, segment: c.server.segment, season: c.server.season });
      await upsertCharacter(m, m.serverId ?? serverId, allianceId);
    }
  }

  // Upsert the requested character last (ensures alliance link present).
  await upsertCharacter(c, serverId, allianceId);
  console.log(`  ✓ ${c.nickname} (server #${serverId})`);
}

async function main() {
  const ids = process.argv.slice(2).map(Number).filter(Boolean);
  if (ids.length === 0) {
    console.error("Usage: npx tsx prisma/import.ts <characterId> [more...]");
    process.exit(1);
  }
  for (const id of ids) {
    try {
      await importCharacter(id);
    } catch (e) {
      console.error(`  ✗ failed for ${id}:`, (e as Error).message);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
