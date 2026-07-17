import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/Bits";
import { PowerChart } from "@/components/PowerChart";
import { AllianceMemberTable } from "@/components/AllianceMemberTable";
import { getAlliance, getAllianceMembers, getAllianceHistory, getHostileTagsFor } from "@/lib/data";
import { ensureMemberHistories } from "@/lib/refresh";
import { formatPower } from "@/lib/format";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";
import type { CharacterView } from "@/lib/types";

export default async function AllianceOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getServerDictionary();
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
        <StatTile label={t.common.totalPower} value={formatPower(alliance.power)} />
        <StatTile label={t.common.members} value={`${characters.length}/${alliance.maxMembers}`} />
        <StatTile
          label={t.common.averagePower}
          value={formatPower(Number(alliance.power) / Math.max(1, characters.length))}
        />
      </div>

      {chartPoints.length >= 2 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">{t.alliance.powerHistory}</h2>
          <PowerChart points={chartPoints} height={180} color="var(--gold)" locale={locale} />
        </Card>
      )}

      <Card className="p-2">
        <h2 className="text-lg font-semibold px-2 pt-2">{t.alliance.members(characters.length)}</h2>
        <AllianceMemberTable characters={characters as CharacterView[]} tagsById={tagsById} locale={locale} />
      </Card>
    </div>
  );
}
