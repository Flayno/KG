/** Clears ALL data (no seeding). Use before importing only-real data. */
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.characterSnapshot.deleteMany();
  await prisma.allianceSnapshot.deleteMany();
  await prisma.character.deleteMany();
  await prisma.alliance.deleteMany();
  await prisma.server.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.flag.deleteMany();
  console.log("Database cleared.");
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
