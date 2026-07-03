import Link from "next/link";
import { Flag, AllianceTag, Rank, BlacklistMark, Tag } from "./Bits";
import { Avatar } from "./Avatar";
import { formatPower, formatNumber } from "@/lib/format";
import type { CharacterView, AllianceView } from "@/lib/types";

export function CharacterTable({
  characters,
  showServer = false,
  startRank = 1,
}: {
  characters: CharacterView[];
  showServer?: boolean;
  startRank?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-subtle text-left border-b border-border text-[11px] uppercase tracking-wider">
            <th className="py-2 pl-2 pr-1 font-medium w-12">#</th>
            <th className="py-2 px-1 font-medium">Персонаж</th>
            <th className="py-2 px-1 font-medium">Альянс</th>
            {showServer && <th className="py-2 px-1 font-medium">Сервер</th>}
            <th className="py-2 px-1 font-medium text-right">Истор. мощь</th>
            <th className="py-2 px-1 font-medium text-right hidden sm:table-cell">Уровень</th>
            <th className="py-2 pl-1 pr-2 font-medium text-right hidden md:table-cell">Был в сети</th>
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
                  {!c.active && (
                    <span className="text-xs text-muted">(неактивен)</span>
                  )}
                </Link>
              </td>
              <td className="py-2 px-1">
                <AllianceTag alliance={c.alliance} />
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
                {c.lastOnlineDays === 0 ? "сегодня" : `${c.lastOnlineDays} дн.`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {characters.length === 0 && (
        <div className="text-muted text-center py-10">Ничего не найдено</div>
      )}
    </div>
  );
}

export function AllianceTable({
  alliances,
  showServer = false,
  startRank = 1,
}: {
  alliances: AllianceView[];
  showServer?: boolean;
  startRank?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-subtle text-left border-b border-border text-[11px] uppercase tracking-wider">
            <th className="py-2 pl-2 pr-1 font-medium w-12">#</th>
            <th className="py-2 px-1 font-medium">Альянс</th>
            {showServer && <th className="py-2 px-1 font-medium">Сервер</th>}
            <th className="py-2 px-1 font-medium text-right">Мощь</th>
            <th className="py-2 pl-1 pr-2 font-medium text-right">Состав</th>
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
                  {a.hostile && <Tag color="orange" title="Недружественный альянс">Недр.</Tag>}
                  {a.hasBlacklisted && <BlacklistMark reason="в альянсе есть игрок из чёрного списка" />}
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
        <div className="text-muted text-center py-10">Ничего не найдено</div>
      )}
    </div>
  );
}
