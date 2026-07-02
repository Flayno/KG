import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, Flag, AllianceTag, BlacklistMark, HostileTags } from "@/components/Bits";
import { Avatar } from "@/components/Avatar";
import { BlacklistButton } from "@/components/BlacklistButton";
import { LinkAccountButton } from "@/components/LinkAccountButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";
import { getCharacter, getHostileTags, getAccountCount } from "@/lib/data";
import { refreshCharacter } from "@/lib/refresh";
import { relativeOnline, relativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function CharacterLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await refreshCharacter(Number(id)); // pull latest + full history (throttled)
  const c = await getCharacter(Number(id));
  if (!c) notFound();
  const hostileTags = await getHostileTags(Number(id));
  const accountCount = await getAccountCount(Number(id));

  const cluster = c.server?.segment?.cluster;
  const base = `/character/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          ...(cluster ? [{ label: cluster.name, href: `/ratings/characters?cluster=${cluster.id}` }] : []),
          { label: `Сервер #${c.serverId}`, href: `/server/${c.serverId}` },
          ...(c.alliance ? [{ label: `[${c.alliance.label}]`, href: `/alliance/${c.alliance.id}` }] : []),
          { label: c.nickname },
        ]}
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-start gap-4">
          <Avatar src={c.avatar} name={c.nickname} size={64} />
          <div className="flex-1 min-w-[12rem]">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Flag flag={c.flag} size={22} />
              {c.nickname}
              {c.blacklisted && <BlacklistMark reason={c.blacklistReason} />}
              {!c.active && (
                <span className="text-xs font-normal text-muted border border-border rounded px-1.5 py-0.5">
                  неактивен
                </span>
              )}
            </h1>
            <div className="text-muted text-sm mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>Альянс: <AllianceTag alliance={c.alliance} /></span>
              <span>Сервер: <Link href={`/server/${c.serverId}`}>#{c.serverId}</Link></span>
              <span>{relativeOnline(c.lastOnlineDays)}</span>
              {c.refreshedAt && (
                <span className="opacity-70">· обновлено {relativeTime(c.refreshedAt)}</span>
              )}
            </div>
            {hostileTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-muted text-xs">Был в недружественных:</span>
                <HostileTags tags={hostileTags} />
              </div>
            )}
            {c.blacklisted && c.blacklistReason && (
              <div className="text-red-400 text-sm mt-2">Причина ЧС: {c.blacklistReason}</div>
            )}
          </div>
          <div className="w-full sm:w-auto flex flex-col gap-2 items-start">
            <BlacklistButton id={c.id} blacklisted={!!c.blacklisted} reason={c.blacklistReason} />
            <LinkAccountButton id={c.id} />
          </div>
        </div>
      </Card>

      <Tabs
        items={[
          { href: base, label: "Обзор" },
          { href: `${base}/activity`, label: "Активность" },
          { href: `${base}/history`, label: "История" },
          { href: `${base}/linked`, label: `Персонажи аккаунта (${accountCount})` },
        ]}
      />

      {children}
    </div>
  );
}
