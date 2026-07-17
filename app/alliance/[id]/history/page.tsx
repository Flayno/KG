import { Card } from "@/components/Bits";
import { fetchOrigin } from "@/lib/origin";
import { getServerDictionary } from "@/lib/i18n-server";

type Hist = {
  id: number;
  name: string;
  label: string;
  date: string;
  leader?: { id: number; nickname: string } | null;
};

export default async function AllianceHistory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getServerDictionary();
  const data = await fetchOrigin<{ histories?: Hist[] }>(`/alliance/${id}/history`);
  const rows = data?.histories ?? [];

  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">{t.alliance.historyTitle}</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 pl-2 pr-1 font-medium">{t.common.date}</th>
              <th className="py-2 px-1 font-medium">{t.common.name}</th>
              <th className="py-2 pl-1 pr-2 font-medium">{t.common.leader}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-1.5 pl-2 pr-1 tabular-nums text-muted">{r.date}</td>
                <td className="py-1.5 px-1 font-medium">[{r.label}] {r.name}</td>
                <td className="py-1.5 pl-1 pr-2 text-muted">{r.leader?.nickname ?? t.common.emptyDash}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-muted text-center py-8">{t.common.noHistory}</div>}
      </div>
    </Card>
  );
}
