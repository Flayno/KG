import { NextRequest, NextResponse } from "next/server";
import { getCharacterRatings } from "@/lib/data";
import { parseRatingQuery } from "@/lib/query";

export async function GET(req: NextRequest) {
  return NextResponse.json(
    await getCharacterRatings(parseRatingQuery(req.nextUrl.searchParams))
  );
}
