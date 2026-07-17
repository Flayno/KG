import Link from "next/link";
import { Card, Flag, AllianceTag, BlacklistMark, HostileTags } from "@/components/Bits";
import { Avatar } from "@/components/Avatar";
import { getFormerMembers, getHostileTagsFor } from "@/lib/data";
import { formatPower } from "@/lib/format";

export default async function AllianceFormer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chars = await getFormerMembers(id);
  const tags = await getHostileTagsFor(chars.map((c) => c.id));

  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">Бывшие участники ({chars.length})</h2>
      <p className="text-muted text-xs px-2 pb-2">Были в альянсе, сейчас в другом месте</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-left border-b border-border">
              <th className="py-2 pl-2 pr-1 font-medium">Игрок</th>
              <th className="py-2 px-1 font-medium">Сейчас в альянсе</th>
              <th className="py-2 px-1 font-medium">Сервер</th>
              <th className="py-2 pl-1 pr-2 font-medium text-right">Истор. мощь</th>
            </tr>
          </thead>
          <tbody>
            {chars.map((c) => (
              <tr key={c.id} className="border-b border-border/60 hover:bg-surface-2/60">
                <td className="py-2 pl-2 pr-1">
                  <Link href={`/character/${c.id}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                    <Avatar src={c.avatar} name={c.nickname} size={28} rounded="rounded-md" />
                    <Flag flag={c.flag} />
                    <span className="font-medium truncate max-w-[11rem]">{c.nickname}</span>
                    {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
                    <HostileTags tags={tags.get(c.id)} />
                  </Link>
                </td>
                <td className="py-2 px-1">
                  {c.alliance ? <AllianceTag alliance={c.alliance} /> : <span className="text-muted">без альянса</span>}
                </td>
                <td className="py-2 px-1">
                  <Link href={`/server/${c.serverId}`} className="text-muted hover:text-foreground">#{c.serverId}</Link>
                </td>
                <td className="py-2 pl-1 pr-2 text-right tabular-nums text-primary">{formatPower(c.maxPower)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {chars.length === 0 && (
          <div className="text-muted text-center py-8">
            Пока нет данных о бывших участниках. Они появляются по мере просмотра игроков.
          </div>
        )}
      </div>
    </Card>
  );
}
