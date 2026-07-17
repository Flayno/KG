import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type ClusterRow = { id: number; name: string; description: string };
type SegmentRow = { id: number; season: number; name: string; clusterId: number };
type ServerRow = {
  id: number;
  online: boolean;
  closed: boolean;
  cold: boolean;
  season: number;
  segmentId: number;
  openDate: string | null;
  offlineDate: string | null;
  kingId: number | null;
};
type FlagRow = { id: number; code: string; name: string; content: string };
type AllianceRow = {
  id: string;
  name: string;
  label: string;
  serverId: number;
  power: string;
  members: number;
  maxMembers: number;
  description: string | null;
  logoImage: string | null;
  techLevel: number;
  kvkWins: number;
  hostile: boolean;
  hostileReason: string | null;
  deleted: boolean;
};
type CharacterRow = {
  id: number;
  nickname: string;
  searchName: string;
  serverId: number;
  allianceId: string | null;
  power: string;
  maxPower: string;
  level: number;
  active: boolean;
  flagId: number | null;
  gender: number;
  lastOnline: string | null;
  deleted: boolean;
  pvpDamage: string;
  pvpRate: number;
  avatar: string | null;
  allianceRank: number | null;
  allianceRankName: string | null;
  blacklisted: boolean;
  blacklistReason: string | null;
  accountKey: string | null;
};
type LinkRow = { characterId: number; allianceUuid: string; label: string; name: string; date: string };
type NameRow = { characterId: number; name: string; searchName: string; date: string };

type Payload = {
  clusters?: ClusterRow[];
  segments?: SegmentRow[];
  servers?: ServerRow[];
  flags?: FlagRow[];
  alliances?: AllianceRow[];
  characters?: CharacterRow[];
  links?: LinkRow[];
  names?: NameRow[];
};

const take = <T,>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);
const big = (v: string | number | bigint | null | undefined) => BigInt(String(v ?? "0"));

type CreateManyDelegate<T> = {
  createMany(args: { data: T[] }): Promise<unknown>;
};

async function createManySkipDuplicates<T>(delegate: CreateManyDelegate<T>, data: T[]) {
  if (!data.length) return;
  const postgresDelegate = delegate as unknown as {
    createMany(args: { data: T[]; skipDuplicates: true }): Promise<unknown>;
  };
  await postgresDelegate.createMany({ data, skipDuplicates: true });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = process.env.ADMIN_KEY;
  if (!adminKey) {
    return NextResponse.json({ error: "import disabled" }, { status: 503 });
  }
  if (url.searchParams.get("key") !== adminKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await req.json().catch(() => ({}))) as Payload;
  const clusters = take<ClusterRow>(payload.clusters);
  const segments = take<SegmentRow>(payload.segments);
  const servers = take<ServerRow>(payload.servers);
  const flags = take<FlagRow>(payload.flags);
  const alliances = take<AllianceRow>(payload.alliances);
  const characters = take<CharacterRow>(payload.characters);
  const links = take<LinkRow>(payload.links);
  const names = take<NameRow>(payload.names);

  await createManySkipDuplicates<Prisma.ClusterCreateManyInput>(prisma.cluster, clusters);
  await createManySkipDuplicates<Prisma.SegmentCreateManyInput>(prisma.segment, segments);
  await createManySkipDuplicates<Prisma.FlagCreateManyInput>(prisma.flag, flags);
  await createManySkipDuplicates<Prisma.ServerCreateManyInput>(prisma.server, servers);
  await createManySkipDuplicates<Prisma.AllianceCreateManyInput>(
    prisma.alliance,
    alliances.map((a) => ({ ...a, power: big(a.power) }))
  );
  await createManySkipDuplicates<Prisma.CharacterCreateManyInput>(
    prisma.character,
    characters.map((c) => ({
      ...c,
      power: big(c.power),
      maxPower: big(c.maxPower),
      pvpDamage: big(c.pvpDamage),
    }))
  );
  await createManySkipDuplicates<Prisma.CharacterAllianceLinkCreateManyInput>(prisma.characterAllianceLink, links);
  await createManySkipDuplicates<Prisma.CharacterNameHistoryCreateManyInput>(prisma.characterNameHistory, names);

  return NextResponse.json({
    ok: true,
    clusters: clusters.length,
    segments: segments.length,
    servers: servers.length,
    flags: flags.length,
    alliances: alliances.length,
    characters: characters.length,
    links: links.length,
    names: names.length,
  });
}
