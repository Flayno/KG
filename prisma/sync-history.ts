/**
 * Bulk-fetch alliance-history for characters so "Бывшие" (former member) lists are
 * complete. Resumable (skips characters already synced via historySyncedAt).
 *
 * Usage:
 *   npm run db:sync-history -- 913          # one server
 *   npm run db:sync-history -- cluster 2    # whole cluster
 *   npm run db:sync-history -- all          # everyone (long!)
 *   npm run db:sync-history -- 913 1042     # several servers
 */
import { PrismaClient } from "@prisma/client";
import { syncCharacterHistory } from "../lib/refresh";

const prisma = new PrismaClient();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  let where: any = { deleted: false, historySyncedAt: null };

  if (args[0] === "all") {
    // no extra filter
  } else if (args[0] === "cluster") {
    const cid = Number(args[1]);
    where = { ...where, server: { segment: { clusterId: cid } } };
    console.log(`Target: cluster ${cid}`);
  } else {
    const serverIds = args.map(Number).filter(Boolean);
    if (serverIds.length === 0) {
      console.error("Usage: db:sync-history -- <serverId...|cluster N|all>");
      process.exit(1);
    }
    where = { ...where, serverId: { in: serverIds } };
    console.log(`Target: servers ${serverIds.join(", ")}`);
  }

  const ids = (await prisma.character.findMany({ where, select: { id: true } })).map((c) => c.id);
  console.log(`Characters to sync: ${ids.length}`);

  const t0 = Date.now();
  const limit = 6;
  let done = 0;
  for (let i = 0; i < ids.length; i += limit) {
    await Promise.all(
      ids.slice(i, i + limit).map((id) => syncCharacterHistory(id).catch(() => {}))
    );
    done += Math.min(limit, ids.length - i);
    if (done % 120 === 0 || done >= ids.length) {
      const mins = ((Date.now() - t0) / 60000).toFixed(1);
      console.log(`[${done}/${ids.length}] (${mins}m)`);
    }
    await sleep(60);
  }
  console.log(`DONE in ${((Date.now() - t0) / 60000).toFixed(1)}m — synced ${done}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
