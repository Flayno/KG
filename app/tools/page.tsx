import Link from "next/link";
import { Card, PageTitle } from "@/components/Bits";
import { getServerDictionary } from "@/lib/i18n-server";

export const metadata = { title: "Tools — KG Companion" };

export default async function ToolsPage() {
  const t = await getServerDictionary();
  const tools = [
    { href: "/ratings/characters", title: t.tools.characterRatings, desc: t.tools.characterRatingsDesc },
    { href: "/ratings/alliances", title: t.tools.allianceRatings, desc: t.tools.allianceRatingsDesc },
    { href: "/compare", title: t.nav.compare, desc: t.tools.compareDesc },
    { href: "/character/search", title: t.tools.characterSearch, desc: t.tools.characterSearchDesc },
    { href: "/clusters", title: t.nav.clusters, desc: t.tools.clustersDesc },
  ];

  return (
    <div>
      <PageTitle title={t.tools.title} subtitle={t.tools.subtitle} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href} className="no-underline">
            <Card className="p-4 hover:border-primary transition-colors h-full">
              <div className="font-semibold text-foreground">{tool.title}</div>
              <div className="text-muted text-sm mt-1">{tool.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
