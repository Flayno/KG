import Link from "next/link";
import { Flag, RankBadge, BlacklistMark, HostileTags } from "./Bits";
import { Avatar } from "./Avatar";
import { formatPower, formatNumber } from "@/lib/format";
import type { CharacterView, HostileTag } from "@/lib/types";

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
  recentPvpById,
}: {
  characters: CharacterView[];
  tagsById?: Map<number, HostileTag[]>;
  recentPvpById?: Map<number, bigint>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-separate border-spacing-0">
        <thead>
          <tr className="text-subtle text-[11px] uppercase tracking-wider [&>th]:font-medium [&>th]:py-2.5 [&>th]:border-b [&>th]:border-border">
            <th className="pl-3 pr-6 text-center w-px whitespace-nowrap">Ранг</th>
            <th className="pr-3 text-left">Игрок</th>
            <th className="px-3 text-right whitespace-nowrap">PvP индекс</th>
            <th className="px-3 text-right whitespace-nowrap">PvP · 7 дн</th>
            <th className="px-3 text-right whitespace-nowrap hidden lg:table-cell">PvP всего</th>
            <th className="px-3 text-right whitespace-nowrap hidden sm:table-cell">Замок</th>
            <th className="pl-3 pr-4 text-right whitespace-nowrap hidden md:table-cell">В сети</th>
          </tr>
        </thead>
        <tbody className="[&>tr>td]:align-middle [&>tr>td]:py-2.5 [&>tr>td]:border-b [&>tr>td]:border-white/[0.04]">
          {characters.map((c, i) => {
            const newGroup = i > 0 && characters[i - 1].allianceRankName !== c.allianceRankName;
            return (
            <tr key={c.id} className={`group transition-colors hover:bg-white/[0.03] ${newGroup ? "[&>td]:border-t-2 [&>td]:border-t-white/[0.12]" : ""}`}>
              <td className="pl-3 pr-6 text-center w-px whitespace-nowrap"><RankBadge name={c.allianceRankName} /></td>
              <td className="pr-3">
                <Link href={`/character/${c.id}`} className="flex items-center gap-2.5 text-foreground group-hover:text-primary transition-colors cursor-pointer">
                  <Avatar src={c.avatar} name={c.nickname} size={30} rounded="rounded-lg" />
                  <Flag flag={c.flag} />
                  <span className="font-medium truncate max-w-[11rem]">{c.nickname}</span>
                  {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
                  <HostileTags tags={tagsById?.get(c.id)} />
                </Link>
              </td>
              <td className={`px-3 text-right tabular-nums font-medium ${pvpIndexColor(c.pvpRate)}`}>{c.pvpRate.toFixed(2)}</td>
              <td className="px-3 text-right tabular-nums font-semibold whitespace-nowrap">
                {(() => {
                  const d = recentPvpById?.get(c.id) ?? 0n;
                  return d > 0n
                    ? <span className="text-success">+{formatPower(d)}</span>
                    : <span className="text-subtle font-normal">пассив</span>;
                })()}
              </td>
              <td className="px-3 text-right tabular-nums text-muted hidden lg:table-cell">{formatPower(c.pvpDamage)}</td>
              <td className="px-3 text-right tabular-nums hidden sm:table-cell">{formatNumber(c.level)}</td>
              <td className={`pl-3 pr-4 text-right tabular-nums hidden md:table-cell ${c.lastOnlineDays === 0 ? "text-success" : "text-muted"}`}>
                {c.lastOnlineDays === 0 ? "сегодня" : `${c.lastOnlineDays} дн.`}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
      {characters.length === 0 && <div className="text-muted text-center py-10">Нет участников</div>}
    </div>
  );
}
