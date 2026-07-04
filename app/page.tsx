import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile, AllianceEmblem, Tag } from "@/components/Bits";
import { Awards } from "@/components/Awards";
import { AllianceMemberTable } from "@/components/AllianceMemberTable";
import { IconTrophy, IconBan, IconMap, IconSearch } from "@/components/icons";
import { getAlliance, getAllianceMembers, getHostileTagsFor, getFormerCount } from "@/lib/data";
import { refreshAlliance, ensureMemberHistories } from "@/lib/refresh";
import { stripGameMarkup } from "@/lib/gameText";
import { formatPower } from "@/lib/format";
import { HOME_ALLIANCE_ID } from "@/lib/config";
import type { CharacterView } from "@/lib/types";

export const dynamic = "force-dynamic";

const QUICK = [
  { href: "/ratings/characters", label: "Рейтинги", Icon: IconTrophy },
  { href: "/bl", label: "Карта BL", Icon: IconMap },
  { href: "/blacklist", label: "Чёрный список", Icon: IconBan },
  { href: "/character/search", label: "Поиск игрока", Icon: IconSearch },
];

export default async function HomePage() {
  const id = HOME_ALLIANCE_ID;
  await refreshAlliance(id); // live data (throttled)
  const a = await getAlliance(id);
  if (!a) notFound();

  const { characters } = await getAllianceMembers(id);
  await ensureMemberHistories(characters.map((c) => c.id));
  const [tagsById, formerCount] = await Promise.all([
    getHostileTagsFor(characters.map((c) => c.id)),
    getFormerCount(id),
  ]);
  const desc = stripGameMarkup(a.description);
  const avg = formatPower(Number(a.power) / Math.max(1, characters.length));

  return (
    <div className="flex flex-col gap-6">
      {/* alliance hero */}
      <Card className="p-5 sm:p-6 relative overflow-hidden">
        <span className="grad-brand absolute -right-16 -top-16 w-56 h-56 rounded-full opacity-[0.12] blur-2xl" aria-hidden />
        <div className="flex flex-col sm:flex-row items-start gap-5 relative">
          <Link href={`/alliance/${id}`} className="shrink-0">
            <AllianceEmblem src={a.logoImage} size={84} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl font-extrabold tracking-tight flex flex-wrap items-center gap-2">
              <Link href={`/alliance/${id}`} className="no-underline text-foreground hover:text-primary">
                [{a.label}] <span className="grad-text">{a.name}</span>
              </Link>
              {a.hostile && <Tag color="orange">Недружественный</Tag>}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2.5 text-sm">
              <Link href={`/server/${a.serverId}`} className="bg-surface-2 rounded-lg px-2.5 py-1 text-muted no-underline hover:text-foreground">
                Сервер #{a.serverId}
              </Link>
              <span className="bg-surface-2 rounded-lg px-2.5 py-1 text-muted">⚔ Тех {a.techLevel}</span>
              {(a.kvkWins ?? 0) > 0 && (
                <span className="bg-surface-2 rounded-lg px-2.5 py-1 inline-flex items-center" title={`Победы BL: ${a.kvkWins}`}>
                  <Awards wins={a.kvkWins ?? 0} size={15} />
                </span>
              )}
            </div>
            {desc && <p className="text-sm text-muted mt-3 whitespace-pre-line line-clamp-3 max-w-2xl">{desc}</p>}
          </div>
        </div>
      </Card>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Суммарная мощь" value={formatPower(a.power)} />
        <StatTile label="Состав" value={`${characters.length}/${a.maxMembers}`} />
        <StatTile label="Средняя мощь" value={avg} />
        <Link href={`/alliance/${id}/former`} className="no-underline">
          <StatTile label="Бывших игроков" value={formerCount} hint="кто ушёл — нажми" />
        </Link>
      </div>

      {/* quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {QUICK.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="no-underline">
            <Card className="p-4 card-hover flex items-center gap-3">
              <span className="grad-brand inline-flex items-center justify-center w-9 h-9 rounded-xl text-white shrink-0 ring-1 ring-white/10">
                <Icon className="w-5 h-5" />
              </span>
              <span className="font-medium text-foreground">{label}</span>
            </Card>
          </Link>
        ))}
      </div>

      {/* roster */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-lg font-bold tracking-tight">Состав ({characters.length})</h2>
          <Link href={`/alliance/${id}`} className="text-sm">Открыть альянс →</Link>
        </div>
        <Card className="p-2">
          <AllianceMemberTable characters={characters as CharacterView[]} tagsById={tagsById} />
        </Card>
      </div>
    </div>
  );
}
