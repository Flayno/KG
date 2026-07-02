# Деплой на Vercel + Neon (бесплатно)

## 1. База данных — Neon
1. На https://neon.com создай проект (или отдельную **базу/branch** под KG, чтобы не мешать планеру).
2. Скопируй строку подключения (Connection string).
   - Для **миграции/импорта** удобнее **direct** (непулерная) строка.
   - Для **рантайма на Vercel** используй **pooled** строку и добавь
     `&pgbouncer=true&connection_limit=1`.
3. Локально положи её в `.env`:
   ```
   DATABASE_URL="postgresql://USER:PASSWORD@ep-...neon.tech/kg?sslmode=require"
   ```

## 2. Создать таблицы и залить данные (один раз, локально)
```bash
npm run db:push          # создаёт таблицы в Neon
npm run db:import-all    # заливает все серверы (один раз; ~150-200 МБ, влезает в free 0.5 ГБ)
```

## 3. Деплой на Vercel
1. Залить проект в GitHub-репозиторий.
2. На vercel.com → New Project → импортировать репозиторий.
3. В **Environment Variables** добавить `DATABASE_URL` = pooled-строка Neon
   (с `&pgbouncer=true&connection_limit=1`).
4. Build Command (если понадобится) — стандартный `next build`.
   `prisma generate` запускается автоматически через `postinstall`/Prisma.
5. Deploy.

## Что работает на free-тарифе
- Просмотр страниц, рейтинги, поиск — обычные serverless-функции.
- **Авто-обновление при просмотре** (`lib/refresh.ts`) — лёгкое, укладывается в лимиты.
- Аватарки идут через прокси `/avatar/...`, кэшируются CDN на сутки.

## Чего НЕ делать на Vercel free
- Запускать `db:import-all` как cron — он идёт минуты, а функция живёт секунды.
  Полный импорт/обновление всех серверов запускай **локально** или на отдельном
  железе (VPS / GitHub Action). На сайте история копится «лениво» — у тех, кого открывают.
