import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile, AllianceEmblem, Tag } from "@/components/Bits";
import { Awards } from "@/components/Awards";
import { AllianceMemberTable } from "@/components/AllianceMemberTable";
import { HeaderSearch } from "@/components/HeaderSearch";
import { getAlliance, getAllianceMembers, getHostileTagsFor, getFormerCount } from "@/lib/data";
import { refreshAlliance, ensureMemberHistories } from "@/lib/refresh";
import { formatPower } from "@/lib/format";
import { HOME_ALLIANCE_ID } from "@/lib/config";
import type { CharacterView } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const avg = formatPower(Number(a.power) / Math.max(1, characters.length));

  return (
    <div className="flex flex-col gap-6">
      {/* search */}
      <HeaderSearch variant="hero" />

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
