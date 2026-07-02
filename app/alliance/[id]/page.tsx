import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/Bits";
import { PowerChart } from "@/components/PowerChart";
import { AllianceMemberTable } from "@/components/AllianceMemberTable";
import { getAlliance, getAllianceMembers, getAllianceHistory, getHostileTagsFor } from "@/lib/data";
import { ensureMemberHistories } from "@/lib/refresh";
import { formatPower } from "@/lib/format";
import type { CharacterView } from "@/lib/types";

export default async function AllianceOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const alliance = await getAlliance(id);
  if (!alliance) notFound();
  const [{ characters }, { history }] = await Promise.all([
    getAllianceMembers(id),
    getAllianceHistory(id),
  ]);
  const chartPoints = history.map((h) => ({ date: h.date, value: Number(h.power) }));
  // pull alliance-history for members so hostile tags show in the roster
  await ensureMemberHistories(characters.map((c) => c.id));
  const tagsById = await getHostileTagsFor(characters.map((c) => c.id));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatTile label="Суммарная мощь" value={formatPower(alliance.power)} />
        <StatTile label="Состав" value={`${characters.length}/${alliance.maxMembers}`} />
        <StatTile
          label="Средняя мощь"
          value={formatPower(Number(alliance.power) / Math.max(1, characters.length))}
        />
      </div>

      {chartPoints.length >= 2 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">История мощи альянса</h2>
          <PowerChart points={chartPoints} color="var(--gold)" />
        </Card>
      )}

      <Card className="p-2">
        <h2 className="text-lg font-semibold px-2 pt-2">Состав ({characters.length})</h2>
        <AllianceMemberTable characters={characters as CharacterView[]} tagsById={tagsById} />
      </Card>
    </div>
  );
}
