import { NextResponse } from "next/server";

// Proxy avatar images from the original host so they load from our own domain.
// Phase 2 will store/serve avatars ourselves; for now we fetch + cache on the edge.
const ORIGIN = "https://kg.dbapp.ru";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const url = `${ORIGIN}/avatar/${path.map(encodeURIComponent).join("/")}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers: { accept: "image/*" } });
  } catch {
    return new NextResponse(null, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !contentType.startsWith("image/")) {
    // No real avatar (e.g. mock characters) -> 404 so the <img> fallback kicks in.
    return new NextResponse(null, { status: 404 });
  }

  const body = await upstream.arrayBuffer();
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "public, max-age=86400, stale-while-revalidate=604800",
    },
  });
}
