import { Card } from "@/components/Bits";
import { AllianceTable } from "@/components/Tables";
import { getServerAlliances } from "@/lib/data";
import type { AllianceView } from "@/lib/types";

export default async function ServerAlliances({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { alliances } = await getServerAlliances(Number(id));
  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">Альянсы ({alliances.length})</h2>
      <AllianceTable alliances={alliances as AllianceView[]} />
    </Card>
  );
}
