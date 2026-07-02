/** Backfill Character.searchName for already-imported rows. One-off. */
import { PrismaClient } from "@prisma/client";
import { normalizeName } from "../lib/normalize";

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.character.count();
  console.log(`Backfilling searchName for ${total} characters...`);
  const pageSize = 2000;
  let done = 0;
  let cursor: number | undefined = undefined;

  for (;;) {
    const batch = await prisma.character.findMany({
      take: pageSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: "asc" },
      select: { id: true, nickname: true },
    });
    if (batch.length === 0) break;
    cursor = batch[batch.length - 1].id;

    await prisma.$transaction(
      batch.map((c) =>
        prisma.character.update({
          where: { id: c.id },
          data: { searchName: normalizeName(c.nickname) },
        })
      )
    );
    done += batch.length;
    if (done % 20000 === 0 || batch.length < pageSize)
      console.log(`  ${done}/${total}`);
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
