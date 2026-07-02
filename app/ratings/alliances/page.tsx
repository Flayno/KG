import { Card, PageTitle } from "@/components/Bits";
import { RatingsControls } from "@/components/RatingsControls";
import { AllianceTable } from "@/components/Tables";
import { getAllianceRatings, getClusters } from "@/lib/data";
import type { AllianceView, ClusterView } from "@/lib/types";

export const metadata = { title: "Рейтинг альянсов — KG Companion" };

export default async function AllianceRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  const clusterId = cluster ? Number(cluster) : undefined;

  const [{ alliances }, clusters] = await Promise.all([
    getAllianceRatings({ clusterId, limit: 200 }),
    getClusters(),
  ]);

  return (
    <div>
      <PageTitle title="Рейтинг альянсов" subtitle="По суммарной мощи" />
      <RatingsControls tab="alliances" clusters={clusters as ClusterView[]} activeCluster={clusterId} />
      <Card className="p-2">
        <AllianceTable alliances={alliances as AllianceView[]} showServer />
      </Card>
    </div>
  );
}
