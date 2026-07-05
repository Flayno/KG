import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshCharacter } from "@/lib/refresh";
import { HOME_ALLIANCE_ID } from "@/lib/config";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * One-time (idempotent) backfill: force-refresh every member of the home
 * alliance so their full activity/PvP history lands in the DB. Runs on Vercel,
 * which can reach both the source API and Neon.
 *
 * Optional guard: if ADMIN_KEY is set, require ?key=... to match.
 * GET /api/admin/backfill?key=...&alliance=<id>
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const adminKey = process.env.ADMIN_KEY;
  if (adminKey && url.searchParams.get("key") !== adminKey) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const allianceId = url.searchParams.get("alliance") || HOME_ALLIANCE_ID;
  const members = await prisma.character.findMany({
    where: { allianceId },
    select: { id: true, nickname: true },
  });

  let refreshed = 0;
  const failed: string[] = [];
  for (const m of members) {
    try {
      if (await refreshCharacter(m.id, true)) refreshed++;
    } catch (e) {
      failed.push(`${m.nickname} (${m.id}): ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ alliance: allianceId, members: members.length, refreshed, failed });
}
