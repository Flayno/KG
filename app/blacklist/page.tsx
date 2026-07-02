import Link from "next/link";
import { Card, PageTitle, Flag, AllianceTag } from "@/components/Bits";
import { Avatar } from "@/components/Avatar";
import { BlacklistButton } from "@/components/BlacklistButton";
import { getBlacklist } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Чёрный список — KG Companion" };

export default async function BlacklistPage() {
  const list = await getBlacklist();

  return (
    <div>
      <PageTitle title="Чёрный список" subtitle={`${list.length} игроков`} />
      <div className="flex flex-col gap-2">
        {list.map((c) => (
          <Card key={c.id} className="p-3 flex flex-wrap items-center gap-3">
            <Avatar src={c.avatar} name={c.nickname} size={36} rounded="rounded-md" />
            <Flag flag={c.flag} />
            <Link href={`/character/${c.id}`} className="font-medium text-foreground hover:text-primary">
              {c.nickname}
            </Link>
            <AllianceTag alliance={c.alliance} />
            <span className="text-muted text-sm">#{c.serverId}</span>
            {c.blacklistReason && <span className="text-red-400 text-sm">— {c.blacklistReason}</span>}
            <span className="flex-1" />
            <BlacklistButton id={c.id} blacklisted reason={c.blacklistReason} />
          </Card>
        ))}
        {list.length === 0 && (
          <Card className="p-8 text-center text-muted">
            Чёрный список пуст. Добавьте игрока на его странице.
          </Card>
        )}
      </div>
    </div>
  );
}
