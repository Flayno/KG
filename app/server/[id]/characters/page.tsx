import { Card } from "@/components/Bits";
import { CharacterTable } from "@/components/Tables";
import { getServerCharacters } from "@/lib/data";
import type { CharacterView } from "@/lib/types";

export default async function ServerCharacters({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { characters } = await getServerCharacters(Number(id));
  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">Персонажи ({characters.length})</h2>
      <CharacterTable characters={characters as CharacterView[]} />
    </Card>
  );
}
