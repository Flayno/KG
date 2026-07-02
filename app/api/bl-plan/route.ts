import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const ID = 1; // single shared plan

export async function GET() {
  const plan = await prisma.blPlan.findUnique({ where: { id: ID } });
  return NextResponse.json(
    plan
      ? { gridSize: plan.gridSize, cells: JSON.parse(plan.cells || "{}"), updatedAt: plan.updatedAt }
      : { gridSize: 20, cells: {}, updatedAt: null }
  );
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const gridSize = Number(body.gridSize) || 20;
  const cells = JSON.stringify(body.cells ?? {});
  const plan = await prisma.blPlan.upsert({
    where: { id: ID },
    create: { id: ID, gridSize, cells },
    update: { gridSize, cells },
  });
  return NextResponse.json({ ok: true, updatedAt: plan.updatedAt });
}
