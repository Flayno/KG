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
import { parseTags } from "@/lib/tags";
import { refreshCharacter } from "@/lib/refresh";
import { relativeOnline, relativeTime } from "@/lib/format";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function CharacterLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getServerDictionary();
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
          { label: `${t.common.server} #${c.serverId}`, href: `/server/${c.serverId}` },
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
                  {t.common.inactive}
                </span>
              )}
            </h1>
            <div className="text-muted text-sm mt-1 flex flex-wrap gap-x-3 gap-y-1">
              <span>{t.common.alliance}: <AllianceTag alliance={c.alliance} locale={locale} /></span>
              <span>{t.common.server}: <Link href={`/server/${c.serverId}`}>#{c.serverId}</Link></span>
              <span>{relativeOnline(c.lastOnlineDays, locale)}</span>
              {c.refreshedAt && (
                <span className="opacity-70">· {t.common.updated} {relativeTime(c.refreshedAt, locale)}</span>
              )}
            </div>
            {hostileTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-muted text-xs">{t.character.hostileHistory}</span>
                <HostileTags tags={hostileTags} locale={locale} />
              </div>
            )}
            {c.blacklisted && parseTags(c.blacklistReason).length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                <span className="text-danger text-xs font-medium">{t.character.blacklist}</span>
                {parseTags(c.blacklistReason).map((t) => (
                  <span key={t} className="inline-flex items-center rounded-full bg-danger/15 text-red-300 ring-1 ring-danger/30 px-2.5 py-0.5 text-xs font-medium">
                    {t}
                  </span>
                ))}
              </div>
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
          { href: base, label: t.common.overview },
          { href: `${base}/activity`, label: t.common.activity },
          { href: `${base}/history`, label: t.common.history },
          { href: `${base}/linked`, label: t.character.accountCharacters(accountCount) },
        ]}
      />

      {children}
    </div>
  );
}
