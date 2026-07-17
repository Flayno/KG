import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/Bits";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";
import { getServer } from "@/lib/data";
import { getServerDictionary } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";

export default async function ServerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getServerDictionary();
  const server = await getServer(Number(id));
  if (!server) notFound();

  const cluster = server.segment?.cluster;
  const base = `/server/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          ...(cluster ? [{ label: cluster.name, href: `/clusters?cluster=${cluster.id}` }] : []),
          { label: `${t.common.server} #${server.id}` },
        ]}
      />

      <Card className="p-5">
        <h1 className="text-2xl font-bold">{t.common.server} #{server.id}</h1>
        <div className="text-muted text-sm mt-1">
          {cluster?.name} · {t.common.season} {server.season} · {t.common.opened} {server.openDate ?? t.common.emptyDash}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label={t.common.status} value={server.online ? t.common.onlineStatus : t.common.offlineStatus} />
        <StatTile label={t.common.cluster} value={cluster?.name ?? t.common.emptyDash} />
        <StatTile label={t.common.season} value={server.season} />
        <StatTile
          label={t.common.king}
          value={
            server.kingChar ? (
              <Link href={`/character/${server.kingChar.id}`} className="text-base">
                {server.kingChar.nickname}
              </Link>
            ) : (
              t.common.emptyDash
            )
          }
        />
      </div>

      <Tabs
        items={[
          { href: `${base}/alliances`, label: t.common.alliances },
          { href: `${base}/characters`, label: t.common.characters },
        ]}
      />

      {children}
    </div>
  );
}
