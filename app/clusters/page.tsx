import Link from "next/link";
import { Card, PageTitle } from "@/components/Bits";
import { getClusters, getClusterServers } from "@/lib/data";
import type { ClusterView, ServerView } from "@/lib/types";

export const metadata = { title: "Кластеры — KG Companion" };

export default async function ClustersPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  const clusterId = cluster ? Number(cluster) : undefined;
  const clusters = (await getClusters()) as ClusterView[];
  const servers = clusterId ? ((await getClusterServers(clusterId)) as ServerView[]) : [];
  const current = clusters.find((c) => c.id === clusterId);

  return (
    <div>
      <PageTitle title="Кластеры серверов" subtitle="Группы серверов Kingdom Guard" />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {clusters.map((c) => (
          <Link
            key={c.id}
            href={`/clusters?cluster=${c.id}`}
            className={`px-3 py-1 rounded text-sm no-underline border ${
              clusterId === c.id ? "border-primary text-primary" : "border-border text-muted hover:text-foreground"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {!current && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {clusters.map((c) => (
            <Link key={c.id} href={`/clusters?cluster=${c.id}`} className="no-underline">
              <Card className="p-5 card-hover h-full relative overflow-hidden">
                <span className="grad-brand absolute -right-6 -top-6 w-16 h-16 rounded-full opacity-20 blur-lg" aria-hidden />
                <div className="text-2xl font-extrabold grad-text w-fit">{c.name}</div>
                <div className="text-muted text-sm mt-1.5">{c.description}</div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {current && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold">
            {current.name} <span className="text-muted font-normal">— {current.description}</span>
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            {servers.map((s) => (
              <Link
                key={s.id}
                href={`/server/${s.id}`}
                className="no-underline bg-surface-2 rounded px-3 py-2 hover:bg-border text-foreground"
              >
                <div className="font-semibold">#{s.id}</div>
                <div className="text-muted text-xs">сезон {s.season}</div>
              </Link>
            ))}
            {servers.length === 0 && <div className="text-muted">Нет серверов</div>}
          </div>
        </Card>
      )}
    </div>
  );
}
