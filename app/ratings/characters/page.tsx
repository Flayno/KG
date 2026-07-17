import { Card, PageTitle } from "@/components/Bits";
import { RatingsControls } from "@/components/RatingsControls";
import { CharacterTable } from "@/components/Tables";
import { getCharacterRatings, getClusters } from "@/lib/data";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";
import type { CharacterView, ClusterView } from "@/lib/types";

export const metadata = { title: "Character ratings — KG Companion" };

export default async function CharacterRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  const locale = await getLocale();
  const t = await getServerDictionary();
  const clusterId = cluster ? Number(cluster) : undefined;

  const [{ characters }, clusters] = await Promise.all([
    getCharacterRatings({ clusterId, limit: 200 }),
    getClusters(),
  ]);

  return (
    <div>
      <PageTitle title={t.ratings.charactersTitle} subtitle={t.ratings.charactersSubtitle} />
      <RatingsControls tab="characters" clusters={clusters as ClusterView[]} activeCluster={clusterId} />
      <Card className="p-2">
        <CharacterTable characters={characters as CharacterView[]} showServer locale={locale} />
      </Card>
    </div>
  );
}
