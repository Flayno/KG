import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/Bits";
import { PowerChart } from "@/components/PowerChart";
import { getCharacter, getCharacterHistory } from "@/lib/data";
import { formatPower, formatNumber } from "@/lib/format";

export default async function CharacterOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = await getCharacter(Number(id));
  if (!character) notFound();
  const { history } = await getCharacterHistory(Number(id));
  const chartPoints = history.map((h) => ({ date: h.date, value: Number(h.power) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Истор. мощь" value={formatPower(character.maxPower)} hint={formatNumber(character.maxPower)} />
        <StatTile label="Текущая мощь" value={formatPower(character.power)} />
        <StatTile label="Уровень" value={formatNumber(character.level)} />
        <StatTile label="PvP урон" value={formatPower(character.pvpDamage)} hint={`${character.pvpRate}% побед`} />
      </div>

      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">История мощи</h2>
        <PowerChart points={chartPoints} />
      </Card>
    </div>
  );
}
