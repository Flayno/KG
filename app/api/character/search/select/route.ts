import { NextRequest, NextResponse } from "next/server";
import { searchCharacters } from "@/lib/data";

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get("search") ?? "";
  return NextResponse.json(await searchCharacters(search));
}
