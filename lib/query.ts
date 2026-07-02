import type { RatingQuery } from "./data";

export function parseRatingQuery(sp: URLSearchParams): RatingQuery {
  const num = (k: string) => {
    const v = sp.get(k);
    return v != null && v !== "" ? Number(v) : undefined;
  };
  return {
    clusterId: num("cluster") ?? num("clusterId"),
    serverId: num("server") ?? num("serverId"),
    search: sp.get("search") ?? undefined,
    limit: num("limit"),
    offset: num("offset"),
  };
}
