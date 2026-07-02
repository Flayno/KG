import { NextResponse } from "next/server";

// Proxies static game assets (alliance emblems, etc.) from the original host,
// so stored paths like "/assets/alliance/compiled/logo_03_10.png" work as-is.
const ORIGIN = "https://kg.dbapp.ru";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${ORIGIN}/assets/${path.map(encodeURIComponent).join("/")}`;
  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: { accept: "image/*" }, next: { revalidate: 86400 } });
  } catch {
    return new NextResponse(null, { status: 502 });
  }
  const ct = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !ct.startsWith("image/")) return new NextResponse(null, { status: 404 });
  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: { "content-type": ct, "cache-control": "public, max-age=86400, stale-while-revalidate=604800" },
  });
}
