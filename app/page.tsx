import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile, AllianceEmblem, Tag } from "@/components/Bits";
import { IconWrench } from "@/components/icons";
import { Awards } from "@/components/Awards";
import { AllianceMemberTable } from "@/components/AllianceMemberTable";
import { HeaderSearch } from "@/components/HeaderSearch";
import { getAlliance, getAllianceMembers, getHostileTagsFor, getFormerCount, getRecentPvpDamage } from "@/lib/data";
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
  const ids = characters.map((c) => c.id);
  const [tagsById, formerCount, recentPvpById] = await Promise.all([
    getHostileTagsFor(ids),
    getFormerCount(id),
    getRecentPvpDamage(ids, 7),
  ]);
  const avg = formatPower(Number(a.power) / Math.max(1, characters.length));

  return (
    <div className="flex flex-col gap-6">
      {/* search */}
      <HeaderSearch variant="hero" />

      {/* alliance hero */}
      <div className="hero-card p-5 sm:p-7">
        <div className="flex flex-col sm:flex-row items-start gap-5 relative">
          <Link href={`/alliance/${id}`} className="shrink-0 emblem-ring">
            <AllianceEmblem src={a.logoImage} size={96} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-3xl sm:text-[2.1rem] font-extrabold tracking-tight leading-tight flex flex-wrap items-center gap-2.5">
              <Link href={`/alliance/${id}`} className="no-underline grad-green-flow hover:opacity-90 transition-opacity">
                [{a.label}] {a.name}
              </Link>
              {a.hostile && <Tag color="orange">Недружественный</Tag>}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <Link href={`/server/${a.serverId}`} className="chip no-underline">
                <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
                Сервер {a.serverId}
              </Link>
              <span className="chip">
                <IconWrench className="w-3.5 h-3.5 text-subtle" />
                Тех {a.techLevel}
              </span>
              {(a.kvkWins ?? 0) > 0 && (
                <span className="chip" title={`Победы BL: ${a.kvkWins}`}>
                  <Awards wins={a.kvkWins ?? 0} size={14} />
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Суммарная мощь" value={formatPower(a.power)} accent="green" />
        <StatTile label="Состав" value={`${characters.length}/${a.maxMembers}`} />
        <StatTile label="Средняя мощь" value={avg} accent="gold" />
        <Link href={`/alliance/${id}/former`} className="no-underline cursor-pointer">
          <StatTile label="Бывших игроков" value={formerCount} hint="кто ушёл — нажми →" accent="violet" />
        </Link>
      </div>

      {/* roster */}
      <div>
        <div className="flex items-center justify-end mb-2.5">
          <Link href={`/alliance/${id}`} className="text-sm">Открыть альянс →</Link>
        </div>
        <Card className="p-2">
          <AllianceMemberTable characters={characters as CharacterView[]} tagsById={tagsById} recentPvpById={recentPvpById} />
        </Card>
      </div>
    </div>
  );
}
