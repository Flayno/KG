import { Card } from "@/components/Bits";
import { PowerTimeline } from "@/components/PowerTimeline";
import { getCharacterHistory } from "@/lib/data";

export default async function CharacterActivity({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { history } = await getCharacterHistory(Number(id));

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-4">
        {history.length < 2 ? (
          <div className="text-muted text-sm py-8 text-center">Недостаточно данных для графика</div>
        ) : (
          <PowerTimeline points={history} />
        )}
      </Card>
    </div>
  );
}
