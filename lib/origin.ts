// Fetches auxiliary data live from the public kg.dbapp.ru API (name history,
// alliance activity / kvk). Cached with Next's revalidate to limit calls.
const ORIGIN = "https://kg.dbapp.ru/api";

export async function fetchOrigin<T = unknown>(
  path: string,
  revalidate = 300
): Promise<T | null> {
  try {
    const res = await fetch(`${ORIGIN}${path}`, {
      headers: { accept: "application/json" },
      next: { revalidate },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
