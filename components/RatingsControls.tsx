import Link from "next/link";
import type { ClusterView } from "@/lib/types";

export function RatingsControls({
  tab,
  clusters,
  activeCluster,
}: {
  tab: "characters" | "alliances";
  clusters: ClusterView[];
  activeCluster?: number;
}) {
  const clusterQS = (id?: number) => (id ? `?cluster=${id}` : "");
  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="inline-flex bg-surface-2 rounded-lg p-1 self-start">
        <Link
          href={`/ratings/characters${clusterQS(activeCluster)}`}
          className={`px-4 py-1.5 rounded-md text-sm no-underline ${
            tab === "characters" ? "bg-primary-strong text-white" : "text-muted hover:text-foreground"
          }`}
        >
          Персонажи
        </Link>
        <Link
          href={`/ratings/alliances${clusterQS(activeCluster)}`}
          className={`px-4 py-1.5 rounded-md text-sm no-underline ${
            tab === "alliances" ? "bg-primary-strong text-white" : "text-muted hover:text-foreground"
          }`}
        >
          Альянсы
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Link
          href={`/ratings/${tab}`}
          className={`px-3 py-1 rounded text-sm no-underline border ${
            !activeCluster
              ? "border-primary text-primary"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          Все
        </Link>
        {clusters.map((c) => (
          <Link
            key={c.id}
            href={`/ratings/${tab}?cluster=${c.id}`}
            title={c.description}
            className={`px-3 py-1 rounded text-sm no-underline border ${
              activeCluster === c.id
                ? "border-primary text-primary"
                : "border-border text-muted hover:text-foreground"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
