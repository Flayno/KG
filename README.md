# KG Companion (клон kg.dbapp.ru) — Этап 1

Локальная копия игрового компаньона Kingdom Guard на **Next.js 16 + React 19 + Tailwind v4 + Prisma (SQLite)**.

## Запуск

```bash
npm install        # один раз
npm run db:push    # создать БД из схемы (один раз)
npm run db:seed    # наполнить тестовыми данными
npm run dev        # http://localhost:3000
```

## Что внутри (Этап 1)

- Полная копия маршрутов оригинала: главная, рейтинги (персонажи/альянсы) с фильтром по кластерам,
  страница персонажа с **графиком истории мощи**, страница альянса с составом и историей,
  страница сервера, кластеры, поиск, сравнение, инструменты.
- **Свой API** под `/api` (как в оригинале) — `app/api/*`.
- **Своя БД** (Prisma, схема в `prisma/schema.prisma`): Cluster → Segment → Server → Alliance → Character
  + снимки мощи во времени (`CharacterSnapshot`, `AllianceSnapshot`).
- Данные — **тестовые** (генератор `prisma/seed.ts`, детерминированный).

## Структура

```
app/            маршруты-страницы + app/api/* (REST-роуты)
components/     UI: Navbar, Tables, PowerChart, Bits, RatingsControls
lib/            prisma, data (слой запросов), serialize (DTO), format, types, query
prisma/         schema.prisma + seed.ts + dev.db (SQLite)
```

## Масштабирование / Этап 2

- Переезд на Postgres: сменить `provider` в `prisma/schema.prisma` на `postgresql`
  и `DATABASE_URL` в `.env`, затем `npm run db:push`.
- Реальные данные: отдельный сборщик, тянущий данные из API игры (tap4fun TGS, gameId 1047).
  Это отдельная задача — запросы игры подписываются (`libsigner.so`), нужен анализ трафика.
