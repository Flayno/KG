import { NextResponse } from "next/server";
import { getRatingsMeta } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getRatingsMeta());
}
