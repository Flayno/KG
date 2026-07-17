import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile, AllianceEmblem, Tag } from "@/components/Bits";
import { IconWrench } from "@/components/icons";
import { Awards } from "@/components/Awards";
import { AllianceMemberTable } from "@/components/AllianceMemberTable";
import { HeaderSearch } from "@/components/HeaderSearch";
import { getAlliance, getAllianceMembers, getHostileTagsFor, getFormerCount, getSeasonPvpDamage } from "@/lib/data";
import { blStatus, seasonNumberAt, formatDaysLeft } from "@/lib/bl";
import { refreshAlliance, ensureMemberHistories } from "@/lib/refresh";
import { formatPower } from "@/lib/format";
import { HOME_ALLIANCE_ID } from "@/lib/config";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";
import type { CharacterView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const locale = await getLocale();
  const t = await getServerDictionary();
  const id = HOME_ALLIANCE_ID;
  await refreshAlliance(id); // live data (throttled)
  const a = await getAlliance(id);
  if (!a) notFound();

  const { characters } = await getAllianceMembers(id);
  await ensureMemberHistories(characters.map((c) => c.id));
  const ids = characters.map((c) => c.id);
  const season = seasonNumberAt();
  const bl = blStatus();
  const [tagsById, formerCount, seasonPvpById] = await Promise.all([
    getHostileTagsFor(ids),
    getFormerCount(id),
    getSeasonPvpDamage(ids, season),
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
              {a.hostile && <Tag color="orange">{t.home.hostile}</Tag>}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <Link href={`/server/${a.serverId}`} className="chip no-underline">
                <span className="w-1.5 h-1.5 rounded-full bg-success" aria-hidden />
                {t.common.server} {a.serverId}
              </Link>
              <span className="chip">
                <IconWrench className="w-3.5 h-3.5 text-subtle" />
                {t.home.tech} {a.techLevel}
              </span>
              {(a.kvkWins ?? 0) > 0 && (
                <span className="chip" title={`${t.home.blWins}: ${a.kvkWins}`}>
                  <Awards wins={a.kvkWins ?? 0} size={14} />
                </span>
              )}
              <span className="chip" title={t.home.blTitle}>
                <span className={`w-1.5 h-1.5 rounded-full ${bl.phase === "active" ? "bg-danger animate-pulse" : "bg-subtle"}`} aria-hidden />
                {bl.phase === "active"
                  ? t.home.blSeasonLeft(bl.season, formatDaysLeft(bl.msToNext, locale))
                  : t.home.blRestLeft(bl.nextSeason, formatDaysLeft(bl.msToNext, locale))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label={t.common.totalPower} value={formatPower(a.power)} accent="green" />
        <StatTile label={t.common.members} value={`${characters.length}/${a.maxMembers}`} />
        <StatTile label={t.common.averagePower} value={avg} accent="gold" />
        <Link href={`/alliance/${id}/former`} className="no-underline cursor-pointer">
          <StatTile label={t.home.formerPlayers} value={formerCount} hint={t.home.formerHint} accent="violet" />
        </Link>
      </div>

      {/* roster */}
      <div>
        <div className="flex items-center justify-end mb-2.5">
          <Link href={`/alliance/${id}`} className="text-sm">{t.common.openAlliance}</Link>
        </div>
        <Card className="p-2">
          <AllianceMemberTable
            characters={characters as CharacterView[]}
            tagsById={tagsById}
            pvpById={seasonPvpById}
            pvpLabel={`PvP · ${t.common.season} ${season}`}
            locale={locale}
          />
        </Card>
      </div>
    </div>
  );
}
