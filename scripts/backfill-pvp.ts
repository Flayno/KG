// One-time backfill: pull the full activity feed (power + pvp history) for every
// current member of the home alliance so the new pvpRate/diffDamage snapshot
// columns are populated retroactively. Safe to re-run.
import { prisma } from "../lib/prisma";
import { refreshCharacter } from "../lib/refresh";

const HOME_ALLIANCE_ID = "642c4c368000029a";

async function main() {
  const members = await prisma.character.findMany({
    where: { allianceId: HOME_ALLIANCE_ID },
    select: { id: true, nickname: true },
  });
  console.log(`Backfilling ${members.length} members…`);
  let ok = 0;
  for (const m of members) {
    try {
      const r = await refreshCharacter(m.id, true);
      if (r) ok++;
      console.log(`  ${r ? "✓" : "·"} ${m.nickname} (${m.id})`);
    } catch (e) {
      console.log(`  ✗ ${m.nickname} (${m.id}): ${(e as Error).message}`);
    }
  }
  console.log(`Done: ${ok}/${members.length} refreshed.`);
  await prisma.$disconnect();
}

main();
