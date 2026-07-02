import { Card } from "@/components/Bits";
import { PowerChart } from "@/components/PowerChart";
import { getCharacterHistory } from "@/lib/data";
import { formatPower, formatNumber } from "@/lib/format";

export default async function CharacterActivity({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { history } = await getCharacterHistory(Number(id));
  const chartPoints = history.map((h) => ({ date: h.date, value: Number(h.power) }));

  // newest first, with day-over-day power delta
  const rows = history
    .map((h, i) => ({
      ...h,
      delta: i > 0 ? Number(h.power) - Number(history[i - 1].power) : 0,
    }))
    .reverse();

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-4">
        <h2 className="text-lg font-semibold mb-2">График мощи</h2>
        <PowerChart points={chartPoints} />
      </Card>

      <Card className="p-2">
        <h2 className="text-lg font-semibold px-2 pt-2">Изменения по дням</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-border">
                <th className="py-2 pl-2 pr-1 font-medium">Дата</th>
                <th className="py-2 px-1 font-medium text-right">Мощь</th>
                <th className="py-2 px-1 font-medium text-right">Δ за день</th>
                <th className="py-2 pl-1 pr-2 font-medium text-right">Уровень</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-1.5 pl-2 pr-1 tabular-nums">{r.date}</td>
                  <td className="py-1.5 px-1 text-right tabular-nums">{formatPower(r.power)}</td>
                  <td
                    className={`py-1.5 px-1 text-right tabular-nums ${
                      r.delta > 0 ? "text-green-400" : r.delta < 0 ? "text-red-400" : "text-muted"
                    }`}
                  >
                    {r.delta === 0 ? "—" : `${r.delta > 0 ? "+" : "−"}${formatPower(Math.abs(r.delta))}`}
                  </td>
                  <td className="py-1.5 pl-1 pr-2 text-right tabular-nums text-muted">
                    {formatNumber(r.level)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <div className="text-muted text-center py-8">Нет данных</div>}
        </div>
      </Card>
    </div>
  );
}
