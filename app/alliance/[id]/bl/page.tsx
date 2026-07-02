import { Card } from "@/components/Bits";
import { Awards } from "@/components/Awards";
import { fetchOrigin } from "@/lib/origin";

type Win = { date: string; season: number };

export default async function AllianceBL({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchOrigin<Win[]>(`/alliance/${id}/kvk`);
  const wins = Array.isArray(data) ? data : [];

  return (
    <div className="flex flex-col gap-5">
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Награды BL</h2>
        <div className="text-muted text-sm mb-3">
          {wins.length} {wins.length === 1 ? "победа" : "побед"}
        </div>
        <Awards wins={wins.length} size={30} />
      </Card>

      <Card className="p-2">
        <h2 className="text-lg font-semibold px-2 pt-2">Победы по сезонам</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-left border-b border-border">
                <th className="py-2 pl-2 pr-1 font-medium">Сезон</th>
                <th className="py-2 pl-1 pr-2 font-medium">Дата</th>
              </tr>
            </thead>
            <tbody>
              {wins.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-1.5 pl-2 pr-1 font-medium">
                    <span className="mr-1">⭐</span>Сезон {r.season}
                  </td>
                  <td className="py-1.5 pl-1 pr-2 tabular-nums text-muted">{r.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {wins.length === 0 && <div className="text-muted text-center py-8">Нет побед в BL</div>}
        </div>
      </Card>
    </div>
  );
}
