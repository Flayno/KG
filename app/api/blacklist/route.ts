import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getBlacklist } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getBlacklist());
}

// Resolve every character on the same account (so blacklist covers the whole account).
async function accountWhere(id: number) {
  const me = await prisma.character.findUnique({ where: { id }, select: { accountKey: true } });
  return me?.accountKey ? { accountKey: me.accountKey } : { id };
}

// Add a character (and all its account's characters) to the blacklist.
// Accepts `tags: string[]` (stored as JSON) or a legacy `reason` string.
export async function POST(req: NextRequest) {
  const { id, reason, tags } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const stored = Array.isArray(tags)
    ? JSON.stringify([...new Set(tags.map((t: string) => String(t).trim()).filter(Boolean))])
    : reason || null;
  await prisma.character.updateMany({
    where: await accountWhere(Number(id)),
    data: { blacklisted: true, blacklistReason: stored },
  });
  return NextResponse.json({ ok: true });
}

// Remove a character (and all its account's characters) from the blacklist.
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.character.updateMany({
    where: await accountWhere(Number(id)),
    data: { blacklisted: false, blacklistReason: null },
  });
  return NextResponse.json({ ok: true });
}
