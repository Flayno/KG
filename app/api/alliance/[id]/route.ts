import { NextResponse } from "next/server";
import { getAlliance, getAllianceMembers } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const alliance = await getAlliance(id);
  if (!alliance)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { characters } = await getAllianceMembers(id);
  return NextResponse.json({ ...alliance, characters });
}
