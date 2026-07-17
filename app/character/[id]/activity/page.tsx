import { Card } from "@/components/Bits";
import { PowerTimeline } from "@/components/PowerTimeline";
import { getCharacterHistory } from "@/lib/data";
import { getServerDictionary } from "@/lib/i18n-server";

export default async function CharacterActivity({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getServerDictionary();
  const { history } = await getCharacterHistory(Number(id));

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-2 sm:p-4">
        {history.length < 2 ? (
          <div className="text-muted text-sm py-8 text-center">{t.character.notEnoughChartData}</div>
        ) : (
          <PowerTimeline points={history} />
        )}
      </Card>
    </div>
  );
}
