import { NextResponse } from "next/server";
import { getClusters } from "@/lib/data";

export async function GET() {
  return NextResponse.json(await getClusters());
}
