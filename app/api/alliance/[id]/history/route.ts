import { NextResponse } from "next/server";
import { getAllianceHistory } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await getAllianceHistory(id));
}
