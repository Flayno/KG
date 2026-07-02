import Link from "next/link";
import { Card, Flag, AllianceTag, BlacklistMark, HostileTags } from "@/components/Bits";
import { Avatar } from "@/components/Avatar";
import { getAccountCharacters, getHostileTagsFor } from "@/lib/data";
import { formatPower, formatNumber } from "@/lib/format";

export default async function LinkedPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const chars = await getAccountCharacters(Number(id));
  const tags = await getHostileTagsFor(chars.map((c) => c.id));
  const current = Number(id);

  return (
    <Card className="p-2">
      <h2 className="text-lg font-semibold px-2 pt-2">Персонажи на аккаунте ({chars.length})</h2>
      <div className="flex flex-col">
        {chars.map((c) => (
          <div
            key={c.id}
            className={`flex flex-wrap items-center gap-2 px-2 py-2.5 border-b border-border/60 ${
              c.id === current ? "bg-surface-2/40" : ""
            }`}
          >
            <Avatar src={c.avatar} name={c.nickname} size={32} rounded="rounded-md" />
            <Flag flag={c.flag} />
            <Link href={`/character/${c.id}`} className="font-medium text-foreground hover:text-primary">
              {c.nickname}
            </Link>
            {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
            <HostileTags tags={tags.get(c.id)} />
            <AllianceTag alliance={c.alliance} />
            <Link href={`/server/${c.serverId}`} className="text-muted text-sm hover:text-foreground">
              #{c.serverId}
            </Link>
            <span className="flex-1" />
            <span className="text-muted text-sm tabular-nums">Замок {formatNumber(c.level)}</span>
            <span className="text-primary font-semibold tabular-nums w-20 text-right">
              {formatPower(c.maxPower)}
            </span>
          </div>
        ))}
        {chars.length === 0 && <div className="text-muted text-center py-8">Нет данных</div>}
      </div>
    </Card>
  );
}
