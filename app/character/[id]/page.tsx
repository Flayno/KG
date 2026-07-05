import { notFound } from "next/navigation";
import { StatTile } from "@/components/Bits";
import { getCharacter } from "@/lib/data";
import { formatPower, formatNumber } from "@/lib/format";

export default async function CharacterOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const character = await getCharacter(Number(id));
  if (!character) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Истор. мощь" value={formatPower(character.maxPower)} hint={formatNumber(character.maxPower)} />
        <StatTile label="Текущая мощь" value={formatPower(character.power)} />
        <StatTile label="Уровень" value={formatNumber(character.level)} />
        <StatTile label="PvP индекс" value={character.pvpRate.toFixed(2)} hint={`урон ${formatPower(character.pvpDamage)}`} />
      </div>
    </div>
  );
}
