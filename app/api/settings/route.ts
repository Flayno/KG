import { NextResponse } from "next/server";

const DESCRIPTION =
  "KG Companion — игровой компаньон для поиска персонажей и просмотра их исторической мощи в игре Kingdom Guard";

export async function GET() {
  return NextResponse.json({
    meta: {
      title: "Kingdom Guard companion",
      tags: {
        description: DESCRIPTION,
        "og:description": DESCRIPTION,
        "og:type": "website",
      },
    },
  });
}
