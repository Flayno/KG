import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, StatTile } from "@/components/Bits";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tabs } from "@/components/Tabs";
import { getServer } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function ServerLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const server = await getServer(Number(id));
  if (!server) notFound();

  const cluster = server.segment?.cluster;
  const base = `/server/${id}`;

  return (
    <div className="flex flex-col gap-4">
      <Breadcrumbs
        items={[
          ...(cluster ? [{ label: cluster.name, href: `/clusters?cluster=${cluster.id}` }] : []),
          { label: `Сервер #${server.id}` },
        ]}
      />

      <Card className="p-5">
        <h1 className="text-2xl font-bold">Сервер #{server.id}</h1>
        <div className="text-muted text-sm mt-1">
          {cluster?.name} · сезон {server.season} · открыт {server.openDate ?? "—"}
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile label="Статус" value={server.online ? "Онлайн" : "Оффлайн"} />
        <StatTile label="Кластер" value={cluster?.name ?? "—"} />
        <StatTile label="Сезон" value={server.season} />
        <StatTile
          label="Король"
          value={
            server.kingChar ? (
              <Link href={`/character/${server.kingChar.id}`} className="text-base">
                {server.kingChar.nickname}
              </Link>
            ) : (
              "—"
            )
          }
        />
      </div>

      <Tabs
        items={[
          { href: `${base}/alliances`, label: "Альянсы" },
          { href: `${base}/characters`, label: "Персонажи" },
        ]}
      />

      {children}
    </div>
  );
}
