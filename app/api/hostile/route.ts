import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mark / unmark an alliance as hostile (unfriendly).
export async function POST(req: NextRequest) {
  const { id, reason } = await req.json().catch(() => ({}));
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.alliance.update({
    where: { id: String(id) },
    data: { hostile: true, hostileReason: reason || null },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await prisma.alliance.update({
    where: { id },
    data: { hostile: false, hostileReason: null },
  });
  return NextResponse.json({ ok: true });
}
