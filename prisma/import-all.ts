/**
 * FULL importer: pulls EVERY server (all clusters) from the public kg.dbapp.ru API
 * into the local DB. Read-only, no game login.
 *
 * Run `npm run db:reset` first (this script assumes an empty DB and uses fast
 * createMany inserts). Then: npm run db:import-all
 *
 * Polite: small delay between servers + retries, to avoid hammering the source.
 */
import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../lib/normalize";

const prisma = new PrismaClient();
const BASE = "https://kg.dbapp.ru/api";
const DELAY_MS = 120; // pause between servers
const big = (v: unknown) => BigInt(String(v ?? "0").split(".")[0] || "0");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
type AnyObj = Record<string, any>;

async function getJSON(path: string, tries = 3): Promise<AnyObj> {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(`${BASE}${path}`, { headers: { accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      if (i === tries) throw e;
      await sleep(500 * i);
    }
  }
  throw new Error("unreachable");
}

// SQLite's createMany doesn't support skipDuplicates, so we dedupe in-memory.
const seenFlags = new Set<number>();
const seenAlliances = new Set<string>();
const seenChars = new Set<number>();
async function ensureFlags(flags: AnyObj[]) {
  const fresh: AnyObj[] = [];
  for (const f of flags) {
    if (f?.id && !seenFlags.has(f.id)) {
      seenFlags.add(f.id);
      fresh.push({ id: f.id, code: f.code ?? "", name: f.name ?? "", content: f.content ?? "" });
    }
  }
  if (fresh.length) await prisma.flag.createMany({ data: fresh });
}

async function importStructure(): Promise<number[]> {
  const clusters: AnyObj[] = await getJSON("/clusters");
  const serverIds: number[] = [];
  for (const c of clusters) {
    const full = await getJSON(`/clusters/${c.id}`);
    await prisma.cluster.create({
      data: { id: full.id, name: full.name ?? "", description: full.description ?? "" },
    });
    for (const seg of full.segments ?? []) {
      await prisma.segment.create({
        data: { id: seg.id, season: seg.season ?? 0, name: seg.name ?? "", clusterId: full.id },
      });
      const servers = (seg.servers ?? []).map((s: AnyObj) => ({
        id: s.id, online: !!s.online, closed: !!s.closed, cold: !!s.cold,
        season: s.season ?? seg.season ?? 0, segmentId: seg.id,
        openDate: s.openDate ?? null, offlineDate: s.offlineDate ?? null,
        kingId: s.king?.id ?? null,
      }));
      for (let i = 0; i < servers.length; i += 500)
        await prisma.server.createMany({ data: servers.slice(i, i + 500) });
      serverIds.push(...servers.map((s: AnyObj) => s.id));
    }
    console.log(`  cluster ${full.name}: ${(full.segments ?? []).reduce((a: number, s: AnyObj) => a + (s.servers?.length ?? 0), 0)} servers`);
  }
  return serverIds;
}

async function importServer(serverId: number, counters: { a: number; c: number }) {
  const [aj, cj] = await Promise.all([
    getJSON(`/server/${serverId}/alliances`),
    getJSON(`/server/${serverId}/characters`),
  ]);
  const alliances: AnyObj[] = aj.alliances ?? [];
  const chars: AnyObj[] = cj.characters ?? [];

  await ensureFlags(chars.map((c) => c.flag).filter(Boolean));

  // alliances + stubs for ids referenced only by characters
  const map = new Map<string, AnyObj>();
  for (const a of alliances) {
    const members = typeof a.members === "number" ? a.members : (a.membersCount ?? 0);
    map.set(a.id, {
      id: a.id, name: a.name ?? "", label: a.label ?? "", serverId: a.serverId ?? serverId,
      power: big(a.power), members, maxMembers: a.maxMembers ?? 100, deleted: !!a.deleted,
    });
  }
  for (const c of chars) {
    const r = c.alliance;
    if (r?.id && !map.has(r.id))
      map.set(r.id, { id: r.id, name: r.name ?? "", label: r.label ?? "", serverId, power: 0n, members: 0, maxMembers: 100, deleted: !!r.deleted });
  }
  const allianceRows = [...map.values()].filter((a) => !seenAlliances.has(a.id));
  allianceRows.forEach((a) => seenAlliances.add(a.id));
  for (let i = 0; i < allianceRows.length; i += 500)
    await prisma.alliance.createMany({ data: allianceRows.slice(i, i + 500) });

  const charRows = chars
    .filter((c) => c.id != null && !seenChars.has(c.id))
    .map((c) => {
      seenChars.add(c.id);
      return {
        id: c.id, nickname: c.nickname ?? "?", searchName: normalizeName(c.nickname ?? ""), serverId: c.serverId ?? serverId,
        allianceId: c.alliance?.id ?? null, power: big(c.power), maxPower: big(c.maxPower),
        level: c.level ?? 0, active: c.active ?? true, flagId: c.flag?.id ?? null,
        gender: c.gender ?? 0, lastOnline: c.lastOnline ?? null, deleted: !!c.deleted,
        pvpDamage: big(c.pvpDamage), pvpRate: c.pvpRate ?? 0, avatar: c.avatar ?? null,
      };
    });
  for (let i = 0; i < charRows.length; i += 500)
    await prisma.character.createMany({ data: charRows.slice(i, i + 500) });

  counters.a += allianceRows.length;
  counters.c += charRows.length;
}

async function main() {
  const t0 = Date.now();
  console.log("Importing structure (clusters/segments/servers)...");
  const serverIds = await importStructure();
  console.log(`Total servers: ${serverIds.length}`);

  const counters = { a: 0, c: 0 };
  let done = 0, failed = 0;
  for (const id of serverIds) {
    try {
      await importServer(id, counters);
    } catch (e) {
      failed++;
      console.warn(`  ! server ${id}: ${(e as Error).message}`);
    }
    done++;
    if (done % 25 === 0 || done === serverIds.length) {
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`[${done}/${serverIds.length}] alliances=${counters.a} chars=${counters.c} failed=${failed} (${mins}m)`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`DONE in ${((Date.now() - t0) / 60000).toFixed(1)}m — alliances=${counters.a} chars=${counters.c} failed=${failed}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
