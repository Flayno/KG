import { Card, PageTitle } from "@/components/Bits";
import { RatingsControls } from "@/components/RatingsControls";
import { AllianceTable } from "@/components/Tables";
import { getAllianceRatings, getClusters } from "@/lib/data";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";
import type { AllianceView, ClusterView } from "@/lib/types";

export const metadata = { title: "Alliance ratings — KG Companion" };

export default async function AllianceRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  const locale = await getLocale();
  const t = await getServerDictionary();
  const clusterId = cluster ? Number(cluster) : undefined;

  const [{ alliances }, clusters] = await Promise.all([
    getAllianceRatings({ clusterId, limit: 200 }),
    getClusters(),
  ]);

  return (
    <div>
      <PageTitle title={t.ratings.alliancesTitle} subtitle={t.ratings.alliancesSubtitle} />
      <RatingsControls tab="alliances" clusters={clusters as ClusterView[]} activeCluster={clusterId} />
      <Card className="p-2">
        <AllianceTable alliances={alliances as AllianceView[]} showServer locale={locale} />
      </Card>
    </div>
  );
}
