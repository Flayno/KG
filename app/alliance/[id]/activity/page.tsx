import Link from "next/link";
import { Card } from "@/components/Bits";
import { PowerChart } from "@/components/PowerChart";
import { fetchOrigin } from "@/lib/origin";
import { prisma } from "@/lib/prisma";
import { formatPower } from "@/lib/format";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";

type Act = {
  id: number;
  date: string;
  rate: number;
  dayRate: number;
  pvpDamage: number;
  diffDamage: number;
  maxPower: number;
  characterID: number;
};

export default async function AllianceActivity({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getServerDictionary();
  const data = await fetchOrigin<{ activities?: Act[] }>(`/alliance/${id}/activity`);
  const activities = data?.activities ?? [];

  // chart: total daily PvP damage across members
  const byDate = new Map<string, number>();
  for (const a of activities) byDate.set(a.date, (byDate.get(a.date) ?? 0) + (a.pvpDamage || 0));
  const chartPoints = [...byDate.entries()]
    .sort((x, y) => x[0].localeCompare(y[0]))
    .map(([date, value]) => ({ date, value }));

  // feed: newest first, resolve member nicknames
  const feed = [...activities].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 120);
  const ids = [...new Set(feed.map((a) => a.characterID))];
  const chars = await prisma.character.findMany({
    where: { id: { in: ids } },
    select: { id: true, nickname: true },
  });
  const nameById = new Map(chars.map((c) => [c.id, c.nickname]));

  return (
    <div className="flex flex-col gap-5">
      {chartPoints.length >= 2 && (
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-2">{t.alliance.pvpChart}</h2>
          <PowerChart points={chartPoints} color="#f783ac" locale={locale} />
        </Card>
      )}

      <Card className="p-2">
        <h2 className="text-lg font-semibold px-2 pt-2">{t.alliance.memberActivity}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-border">
                <th className="py-2 pl-2 pr-1 font-medium">{t.common.date}</th>
                <th className="py-2 px-1 font-medium">{t.common.player}</th>
                <th className="py-2 px-1 font-medium text-right">{t.common.pvpDamage}</th>
                <th className="py-2 px-1 font-medium text-right">{t.common.deltaDamage}</th>
                <th className="py-2 pl-1 pr-2 font-medium text-right">{t.common.deltaRating}</th>
              </tr>
            </thead>
            <tbody>
              {feed.map((a) => (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="py-1.5 pl-2 pr-1 tabular-nums text-muted">{a.date}</td>
                  <td className="py-1.5 px-1">
                    <Link href={`/character/${a.characterID}`} className="text-foreground hover:text-primary">
                      {nameById.get(a.characterID) ?? `#${a.characterID}`}
                    </Link>
                  </td>
                  <td className="py-1.5 px-1 text-right tabular-nums">{formatPower(a.pvpDamage)}</td>
                  <td className={`py-1.5 px-1 text-right tabular-nums ${a.diffDamage > 0 ? "text-green-400" : a.diffDamage < 0 ? "text-red-400" : "text-muted"}`}>
                    {a.diffDamage ? `${a.diffDamage > 0 ? "+" : "−"}${formatPower(Math.abs(a.diffDamage))}` : t.common.emptyDash}
                  </td>
                  <td className={`py-1.5 pl-1 pr-2 text-right tabular-nums ${a.dayRate > 0 ? "text-green-400" : a.dayRate < 0 ? "text-red-400" : "text-muted"}`}>
                    {a.dayRate ? `${a.dayRate > 0 ? "+" : ""}${a.dayRate.toFixed(2)}` : t.common.emptyDash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {feed.length === 0 && <div className="text-muted text-center py-8">{t.alliance.noActivity}</div>}
        </div>
      </Card>
    </div>
  );
}
