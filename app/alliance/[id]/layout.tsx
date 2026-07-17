import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, AllianceEmblem, BlacklistMark, Tag } from "@/components/Bits";
import { Awards } from "@/components/Awards";
import { HostileButton } from "@/components/HostileButton";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";
import { getAlliance, getFormerCount } from "@/lib/data";
import { refreshAlliance } from "@/lib/refresh";
import { relativeTime } from "@/lib/format";
import { stripGameMarkup } from "@/lib/gameText";
import { getLocale, getServerDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function AllianceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  const t = await getServerDictionary();
  await refreshAlliance(id); // refresh alliance + all members (throttled)
  const a = await getAlliance(id);
  if (!a) notFound();
  const formerCount = await getFormerCount(id);

  const cluster = a.server?.segment?.cluster;
  const description = stripGameMarkup(a.description);
  const base = `/alliance/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          ...(cluster ? [{ label: cluster.name, href: `/ratings/alliances?cluster=${cluster.id}` }] : []),
          { label: `${t.common.server} #${a.serverId}`, href: `/server/${a.serverId}` },
          { label: `[${a.label}]` },
        ]}
      />

      <Card className="p-5">
        <div className="flex items-start gap-4">
          <AllianceEmblem src={a.logoImage} size={56} />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold flex items-center gap-2 flex-wrap">
              [{a.label}] <span className="text-muted font-normal">{a.name}</span>
              {a.hostile && (
                <Tag color="orange" title={a.hostileReason ?? t.hostile.alliance}>
                  {t.home.hostile}
                </Tag>
              )}
              {a.hasBlacklisted && <BlacklistMark reason={t.hostile.hasBlacklisted} />}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
              <Link href={`/server/${a.serverId}`} className="bg-surface-2 rounded px-2 py-0.5 text-muted no-underline hover:text-foreground">
                {t.common.server} #{a.serverId}
              </Link>
              <span className="bg-surface-2 rounded px-2 py-0.5 text-muted">⚔ {a.techLevel}</span>
              {(a.kvkWins ?? 0) > 0 && (
                <span className="bg-surface-2 rounded px-2 py-0.5 inline-flex items-center" title={`${t.home.blWins}: ${a.kvkWins}`}>
                  <Awards wins={a.kvkWins ?? 0} size={15} />
                </span>
              )}
              {a.refreshedAt && (
                <span className="text-muted opacity-70">{t.common.updated} {relativeTime(a.refreshedAt, locale)}</span>
              )}
            </div>
            {description && (
              <p className="text-sm text-muted mt-3 whitespace-pre-line border-t border-border pt-3">
                {description}
              </p>
            )}
            <div className="mt-3">
              <HostileButton id={a.id} hostile={!!a.hostile} reason={a.hostileReason} />
            </div>
          </div>
        </div>
      </Card>

      <Tabs
        items={[
          { href: base, label: t.common.overview },
          { href: `${base}/history`, label: t.common.history },
          { href: `${base}/activity`, label: t.common.activity },
          { href: `${base}/former`, label: `${t.common.former} (${formerCount})` },
          { href: `${base}/bl`, label: "BL" },
        ]}
      />

      {children}
    </div>
  );
}
