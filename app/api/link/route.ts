import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { refreshCharacter, mergeAccounts } from "@/lib/refresh";

// Manually link two characters as the same person (merge their accounts).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const a = Number(body.a);
  const b = Number(body.b);
  if (!a || !b || a === b)
    return NextResponse.json({ error: "two distinct ids required" }, { status: 400 });

  // make sure both characters exist locally (import on demand)
  for (const id of [a, b]) {
    const ex = await prisma.character.findUnique({ where: { id }, select: { id: true } });
    if (!ex) {
      const ok = await refreshCharacter(id, true);
      if (!ok)
        return NextResponse.json({ error: `character ${id} not found` }, { status: 404 });
    }
  }

  const [lo, hi] = a < b ? [a, b] : [b, a];
  await prisma.manualLink.upsert({
    where: { a_b: { a: lo, b: hi } },
    create: { a: lo, b: hi },
    update: {},
  });
  await mergeAccounts([a, b]);
  return NextResponse.json({ ok: true });
}

// Remove a manual link and let both groups re-derive from the game on next view.
export async function DELETE(req: NextRequest) {
  const a = Number(req.nextUrl.searchParams.get("a"));
  const b = Number(req.nextUrl.searchParams.get("b"));
  if (!a || !b) return NextResponse.json({ error: "a and b required" }, { status: 400 });
  const [lo, hi] = a < b ? [a, b] : [b, a];
  await prisma.manualLink.deleteMany({ where: { a: lo, b: hi } });
  // force re-sync so accountKey is recomputed from the game grouping
  await refreshCharacter(a, true).catch(() => {});
  await refreshCharacter(b, true).catch(() => {});
  return NextResponse.json({ ok: true });
}
