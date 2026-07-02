import Link from "next/link";
import { Card } from "@/components/Bits";
import { fetchOrigin } from "@/lib/origin";

type NameEntry = {
  id: number;
  name: string;
  date: string;
  allianceHistory?: { name: string; label: string; uuid: string } | null;
};

export default async function CharacterNameHistory({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await fetchOrigin<NameEntry[]>(`/character/${id}/history`);
  const rows = Array.isArray(data) ? data : [];

  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">История имён и альянсов</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 pl-2 pr-1 font-medium">Дата</th>
              <th className="py-2 px-1 font-medium">Имя</th>
              <th className="py-2 pl-1 pr-2 font-medium">Альянс</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60">
                <td className="py-1.5 pl-2 pr-1 tabular-nums text-muted">{r.date}</td>
                <td className="py-1.5 px-1 font-medium">{r.name}</td>
                <td className="py-1.5 pl-1 pr-2">
                  {r.allianceHistory ? (
                    <Link href={`/alliance/${r.allianceHistory.uuid}`} className="text-muted hover:text-foreground">
                      [{r.allianceHistory.label}] {r.allianceHistory.name}
                    </Link>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-muted text-center py-8">Нет истории</div>}
      </div>
    </Card>
  );
}
