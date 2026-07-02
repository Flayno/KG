import Link from "next/link";
import { Card, PageTitle } from "@/components/Bits";

export const metadata = { title: "Инструменты — KG Companion" };

const TOOLS = [
  { href: "/ratings/characters", title: "Рейтинг персонажей", desc: "Топ по мощи, фильтр по кластеру" },
  { href: "/ratings/alliances", title: "Рейтинг альянсов", desc: "Сильнейшие альянсы серверов" },
  { href: "/compare", title: "Сравнение", desc: "Сравнить двух персонажей по характеристикам" },
  { href: "/character/search", title: "Поиск персонажа", desc: "Найти игрока по нику" },
  { href: "/clusters", title: "Кластеры", desc: "Структура серверов по группам" },
];

export default function ToolsPage() {
  return (
    <div>
      <PageTitle title="Инструменты" subtitle="Доступные разделы компаньона" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="no-underline">
            <Card className="p-4 hover:border-primary transition-colors h-full">
              <div className="font-semibold text-foreground">{t.title}</div>
              <div className="text-muted text-sm mt-1">{t.desc}</div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
