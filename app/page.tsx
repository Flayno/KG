import Link from "next/link";
import { Card } from "@/components/Bits";
import { CharacterTable } from "@/components/Tables";
import { getCharacterRatings, getClusters } from "@/lib/data";
import type { CharacterView, ClusterView } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [{ characters }, clusters] = await Promise.all([
    getCharacterRatings({ limit: 10 }),
    getClusters(),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="text-center py-6">
        <h1 className="text-3xl sm:text-4xl font-bold">
          Kingdom Guard <span className="text-primary">Companion</span>
        </h1>
        <p className="text-muted mt-2 max-w-xl mx-auto">
          Поиск персонажей и альянсов, рейтинги мощи и просмотр исторической
          динамики в игре Kingdom Guard.
        </p>
        <div className="flex flex-wrap gap-2 justify-center mt-4">
          <Link
            href="/ratings/characters"
            className="px-4 py-2 rounded bg-primary-strong text-white no-underline hover:opacity-90"
          >
            Рейтинг персонажей
          </Link>
          <Link
            href="/character/search"
            className="px-4 py-2 rounded bg-surface-2 text-foreground no-underline hover:bg-border"
          >
            Найти персонажа
          </Link>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Топ персонажей</h2>
          <Link href="/ratings/characters" className="text-sm">
            Весь рейтинг →
          </Link>
        </div>
        <Card className="p-2">
          <CharacterTable characters={characters as CharacterView[]} showServer />
        </Card>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-2">Кластеры серверов</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(clusters as ClusterView[]).map((c) => (
            <Link
              key={c.id}
              href={`/clusters?cluster=${c.id}`}
              className="no-underline"
            >
              <Card className="p-4 hover:border-primary transition-colors h-full">
                <div className="text-xl font-bold">{c.name}</div>
                <div className="text-muted text-sm mt-1">{c.description}</div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
