import { Card } from "@/components/Bits";
import { CharacterTable } from "@/components/Tables";
import { getServerCharacters } from "@/lib/data";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";
import type { CharacterView } from "@/lib/types";

export default async function ServerCharacters({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getServerDictionary();
  const { characters } = await getServerCharacters(Number(id));
  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">{t.common.characters} ({characters.length})</h2>
      <CharacterTable characters={characters as CharacterView[]} locale={locale} />
    </Card>
  );
}
