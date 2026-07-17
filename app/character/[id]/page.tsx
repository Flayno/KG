import { notFound } from "next/navigation";
import { StatTile } from "@/components/Bits";
import { getCharacter } from "@/lib/data";
import { formatPower, formatNumber } from "@/lib/format";
import { getServerDictionary } from "@/lib/i18n-server";

export default async function CharacterOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getServerDictionary();
  const character = await getCharacter(Number(id));
  if (!character) notFound();

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label={t.common.historicalPower} value={formatPower(character.maxPower)} hint={formatNumber(character.maxPower)} />
        <StatTile label={t.common.currentPower} value={formatPower(character.power)} />
        <StatTile label={t.common.level} value={formatNumber(character.level)} />
        <StatTile label={t.common.pvpIndex} value={character.pvpRate.toFixed(2)} hint={`${t.common.pvpDamage} ${formatPower(character.pvpDamage)}`} />
      </div>
    </div>
  );
}
