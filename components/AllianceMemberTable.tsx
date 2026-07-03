import Link from "next/link";
import { Flag, RankBadge, BlacklistMark, HostileTags } from "./Bits";
import { Avatar } from "./Avatar";
import { formatPower, formatNumber } from "@/lib/format";
import type { CharacterView, HostileTag } from "@/lib/types";

export function AllianceMemberTable({
  characters,
  tagsById,
}: {
  characters: CharacterView[];
  tagsById?: Map<number, HostileTag[]>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-subtle text-left border-b border-border text-[11px] uppercase tracking-wider">
            <th className="py-2 pl-2 pr-1 font-medium">Игрок</th>
            <th className="py-2 px-1 font-medium">Ранг</th>
            <th className="py-2 px-1 font-medium text-right">PvP индекс</th>
            <th className="py-2 px-1 font-medium text-right">PvP урон</th>
            <th className="py-2 px-1 font-medium text-right hidden sm:table-cell">Замок</th>
            <th className="py-2 pl-1 pr-2 font-medium text-right hidden md:table-cell">В сети</th>
          </tr>
        </thead>
        <tbody>
          {characters.map((c) => (
            <tr key={c.id} className="border-b border-border/60 hover:bg-surface-2/60 transition-colors">
              <td className="py-2 pl-2 pr-1">
                <Link href={`/character/${c.id}`} className="flex items-center gap-2 text-foreground hover:text-primary">
                  <Avatar src={c.avatar} name={c.nickname} size={28} rounded="rounded-md" />
                  <Flag flag={c.flag} />
                  <span className="font-medium truncate max-w-[11rem]">{c.nickname}</span>
                  {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
                  <HostileTags tags={tagsById?.get(c.id)} />
                </Link>
              </td>
              <td className="py-2 px-1"><RankBadge name={c.allianceRankName} /></td>
              <td className="py-2 px-1 text-right tabular-nums">{c.pvpRate.toFixed(2)}</td>
              <td className="py-2 px-1 text-right tabular-nums text-primary">{formatPower(c.pvpDamage)}</td>
              <td className="py-2 px-1 text-right tabular-nums hidden sm:table-cell">{formatNumber(c.level)}</td>
              <td className="py-2 pl-1 pr-2 text-right text-muted hidden md:table-cell">
                {c.lastOnlineDays === 0 ? "сегодня" : `${c.lastOnlineDays} дн.`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {characters.length === 0 && <div className="text-muted text-center py-10">Нет участников</div>}
    </div>
  );
}
