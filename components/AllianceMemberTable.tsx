import Link from "next/link";
import { Flag, RankBadge, BlacklistMark, HostileTags } from "./Bits";
import { Avatar } from "./Avatar";
import { formatPower, formatNumber } from "@/lib/format";
import type { CharacterView, HostileTag } from "@/lib/types";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";

/** Colour the PvP index so weak members stand out at a glance. */
function pvpIndexColor(rate: number): string {
  if (rate >= 400) return "text-success";
  if (rate >= 300) return "text-foreground";
  if (rate >= 200) return "text-amber-300";
  return "text-red-400";
}

export function AllianceMemberTable({
  characters,
  tagsById,
  pvpById,
  pvpLabel,
  locale = DEFAULT_LOCALE,
}: {
  characters: CharacterView[];
  tagsById?: Map<number, HostileTag[]>;
  pvpById?: Map<number, bigint>;
  pvpLabel?: string;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  const resolvedPvpLabel = pvpLabel ?? `PvP · 7 ${t.common.daysShort}`;

  return (
    <div className="overflow-x-auto">
      <table className="w-full sm:table-fixed text-sm border-separate border-spacing-0">
        <colgroup>
          <col className="w-14" />
          <col />
          <col className="w-24" />
          <col className="w-24" />
          <col className="w-24" />
          <col className="hidden lg:table-column w-24" />
          <col className="hidden sm:table-column w-20" />
          <col className="hidden md:table-column w-24" />
        </colgroup>
        <thead>
          <tr className="text-subtle text-[11px] uppercase tracking-wider [&>th]:font-medium [&>th]:py-2.5 [&>th]:border-b [&>th]:border-border">
            <th className="pl-3 pr-2 text-center whitespace-nowrap">{t.common.rank}</th>
            <th className="pr-3 text-left">{t.common.player}</th>
            <th className="px-2 text-center whitespace-nowrap">{t.common.power}</th>
            <th className="px-2 text-center whitespace-nowrap">{t.common.pvpIndex}</th>
            <th className="px-2 text-center whitespace-nowrap">{resolvedPvpLabel}</th>
            <th className="px-2 text-center whitespace-nowrap hidden lg:table-cell">{t.common.pvpTotal}</th>
            <th className="px-2 text-center whitespace-nowrap hidden sm:table-cell">{t.common.castle}</th>
            <th className="pl-3 pr-4 text-center whitespace-nowrap hidden md:table-cell">{t.common.online}</th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:align-middle [&>tr>td]:py-2.5 [&>tr>td]:border-b [&>tr>td]:border-white/[0.04]">
          {characters.map((c, i) => {
            const newGroup = i > 0 && characters[i - 1].allianceRankName !== c.allianceRankName;
            return (
            <tr key={c.id} className={`group transition-colors hover:bg-white/[0.03] ${newGroup ? "[&>td]:border-t-2 [&>td]:border-t-white/[0.12]" : ""}`}>
              <td className="pl-3 pr-2 text-center whitespace-nowrap"><RankBadge name={c.allianceRankName} /></td>
              <td className="pr-3 min-w-0">
                <Link href={`/character/${c.id}`} className="flex min-w-0 items-center gap-2.5 text-foreground group-hover:text-primary transition-colors cursor-pointer">
                  <Avatar src={c.avatar} name={c.nickname} size={30} rounded="rounded-lg" />
                  <Flag flag={c.flag} />
                  <span className="font-medium truncate max-w-[11rem]">{c.nickname}</span>
                  {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
                  <HostileTags tags={tagsById?.get(c.id)} locale={locale} />
                </Link>
              </td>
              <td className="px-2 text-center tabular-nums font-semibold text-primary whitespace-nowrap w-24" title={formatNumber(c.power)}>
                {formatPower(c.power)}
              </td>
              <td className={`px-2 text-center tabular-nums font-medium w-24 ${pvpIndexColor(c.pvpRate)}`}>{c.pvpRate.toFixed(2)}</td>
              <td className="px-2 text-center tabular-nums font-semibold whitespace-nowrap w-24">
                {(() => {
                  const d = pvpById?.get(c.id) ?? 0n;
                  return d > 0n
                    ? <span className="text-success">+{formatPower(d)}</span>
                    : <span className="text-subtle font-normal">{t.common.passive}</span>;
                })()}
              </td>
              <td className="px-2 text-center tabular-nums text-muted hidden lg:table-cell w-24">{formatPower(c.pvpDamage)}</td>
              <td className="px-2 text-center tabular-nums hidden sm:table-cell w-20">{formatNumber(c.level)}</td>
              <td className={`pl-3 pr-4 text-center tabular-nums hidden md:table-cell ${c.lastOnlineDays === 0 ? "text-success" : "text-muted"}`}>
                {c.lastOnlineDays === 0 ? t.common.today : `${c.lastOnlineDays} ${t.common.daysShort}`}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {characters.length === 0 && <div className="text-muted text-center py-10">{t.common.noData}</div>}
    </div>
  );
}
