import { NextResponse } from "next/server";
import { getCharacter } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const character = await getCharacter(Number(id));
  if (!character)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(character);
}
