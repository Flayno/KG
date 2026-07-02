import { NextRequest, NextResponse } from "next/server";
import { getAllianceRatings } from "@/lib/data";
import { parseRatingQuery } from "@/lib/query";

export async function GET(req: NextRequest) {
  return NextResponse.json(
    await getAllianceRatings(parseRatingQuery(req.nextUrl.searchParams))
  );
}
