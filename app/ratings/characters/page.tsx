import { Card, PageTitle } from "@/components/Bits";
import { RatingsControls } from "@/components/RatingsControls";
import { CharacterTable } from "@/components/Tables";
import { getCharacterRatings, getClusters } from "@/lib/data";
import type { CharacterView, ClusterView } from "@/lib/types";

export const metadata = { title: "Рейтинг персонажей — KG Companion" };

export default async function CharacterRatingsPage({
  searchParams,
}: {
  searchParams: Promise<{ cluster?: string }>;
}) {
  const { cluster } = await searchParams;
  const clusterId = cluster ? Number(cluster) : undefined;

  const [{ characters }, clusters] = await Promise.all([
    getCharacterRatings({ clusterId, limit: 200 }),
    getClusters(),
  ]);

  return (
    <div>
      <PageTitle title="Рейтинг персонажей" subtitle="По текущей мощи" />
      <RatingsControls tab="characters" clusters={clusters as ClusterView[]} activeCluster={clusterId} />
      <Card className="p-2">
        <CharacterTable characters={characters as CharacterView[]} showServer />
      </Card>
    </div>
  );
}
