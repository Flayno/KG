import { NextResponse } from "next/server";
import { isLocale } from "@/lib/i18n";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as { locale?: string };
  if (!isLocale(body.locale)) {
    return NextResponse.json({ error: "unsupported locale" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, locale: body.locale });
  res.cookies.set("kg-locale", body.locale, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
