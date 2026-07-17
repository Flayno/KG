import Link from "next/link";
import { Flag, AllianceTag, Rank, BlacklistMark, Tag } from "./Bits";
import { Avatar } from "./Avatar";
import { formatPower, formatNumber } from "@/lib/format";
import type { CharacterView, AllianceView } from "@/lib/types";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "@/lib/i18n";

export function CharacterTable({
  characters,
  showServer = false,
  startRank = 1,
  locale = DEFAULT_LOCALE,
}: {
  characters: CharacterView[];
  showServer?: boolean;
  startRank?: number;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-subtle text-left border-b border-border text-[11px] uppercase tracking-wider">
            <th className="py-2 pl-2 pr-1 font-medium w-12">#</th>
            <th className="py-2 px-1 font-medium">{t.common.character}</th>
            <th className="py-2 px-1 font-medium">{t.common.alliance}</th>
            {showServer && <th className="py-2 px-1 font-medium">{t.common.server}</th>}
            <th className="py-2 px-1 font-medium text-right">{t.common.historicalPower}</th>
            <th className="py-2 px-1 font-medium text-right hidden sm:table-cell">{t.common.level}</th>
            <th className="py-2 pl-1 pr-2 font-medium text-right hidden md:table-cell">{t.common.online}</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((c, i) => (
            <tr
              key={c.id}
              className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors"
            >
              <td className="py-2 pl-2 pr-1">
                <Rank n={startRank + i} />
              </td>
              <td className="py-2 px-1">
                <Link
                  href={`/character/${c.id}`}
                  className="flex items-center gap-2 text-foreground hover:text-primary"
                >
                  <Avatar src={c.avatar} name={c.nickname} size={28} rounded="rounded-md" />
                  <Flag flag={c.flag} />
                  <span className="font-medium truncate max-w-[12rem]">{c.nickname}</span>
                  {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
                  {!c.active && <span className="text-xs text-muted">({t.common.inactive})</span>}
                </Link>
              </td>
              <td className="py-2 px-1">
                <AllianceTag alliance={c.alliance} locale={locale} />
              </td>
              {showServer && (
                <td className="py-2 px-1">
                  <Link href={`/server/${c.serverId}`} className="text-muted hover:text-foreground">
                    #{c.serverId}
                  </Link>
                </td>
              )}
              <td className="py-2.5 px-1 text-right tabular-nums font-mono font-semibold text-accent">
                {formatPower(c.maxPower)}
              </td>
              <td className="py-2 px-1 text-right tabular-nums hidden sm:table-cell">
                {formatNumber(c.level)}
              </td>
              <td className="py-2 pl-1 pr-2 text-right text-muted hidden md:table-cell">
                {c.lastOnlineDays === 0 ? t.common.today : `${c.lastOnlineDays} ${t.common.daysShort}`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {characters.length === 0 && (
        <div className="text-muted text-center py-10">{t.common.nothingFound}</div>
      )}
    </div>
  );
}

export function AllianceTable({
  alliances,
  showServer = false,
  startRank = 1,
  locale = DEFAULT_LOCALE,
}: {
  alliances: AllianceView[];
  showServer?: boolean;
  startRank?: number;
  locale?: Locale;
}) {
  const t = getDictionary(locale);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-subtle text-left border-b border-border text-[11px] uppercase tracking-wider">
            <th className="py-2 pl-2 pr-1 font-medium w-12">#</th>
            <th className="py-2 px-1 font-medium">{t.common.alliance}</th>
            {showServer && <th className="py-2 px-1 font-medium">{t.common.server}</th>}
            <th className="py-2 px-1 font-medium text-right">{t.common.power}</th>
            <th className="py-2 pl-1 pr-2 font-medium text-right">{t.common.members}</th>
          </tr>
        </thead>
        <tbody>
          {alliances.map((a, i) => (
            <tr
              key={a.id}
              className="border-b border-white/[0.05] hover:bg-white/[0.04] transition-colors"
            >
              <td className="py-2 pl-2 pr-1">
                <Rank n={startRank + i} />
              </td>
              <td className="py-2 px-1">
                <Link
                  href={`/alliance/${a.id}`}
                  className="text-foreground hover:text-primary font-medium inline-flex items-center gap-1.5"
                >
                  <span>[{a.label}] <span className="text-muted font-normal">{a.name}</span></span>
                  {a.hostile && <Tag color="orange" title={t.hostile.alliance}>{t.hostile.short}</Tag>}
                  {a.hasBlacklisted && <BlacklistMark reason={t.hostile.hasBlacklisted} />}
                </Link>
              </td>
              {showServer && (
                <td className="py-2 px-1">
                  <Link href={`/server/${a.serverId}`} className="text-muted hover:text-foreground">
                    #{a.serverId}
                  </Link>
                </td>
              )}
              <td className="py-2.5 px-1 text-right tabular-nums font-mono font-semibold text-accent">
                {formatPower(a.power)}
              </td>
              <td className="py-2 pl-1 pr-2 text-right tabular-nums text-muted">
                {a.members}/{a.maxMembers}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {alliances.length === 0 && (
        <div className="text-muted text-center py-10">{t.common.nothingFound}</div>
      )}
    </div>
  );
}
