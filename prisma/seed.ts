import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---- deterministic RNG so re-seeding gives stable data ----
let _s = 1337;
function rnd() {
  _s = (_s * 1103515245 + 12345) & 0x7fffffff;
  return _s / 0x7fffffff;
}
const pick = <T>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];
const int = (min: number, max: number) => Math.floor(rnd() * (max - min + 1)) + min;
let _allianceSeq = 0;
function hexId(): string {
  // 8 random hex chars + 8-char zero-padded counter -> always unique, 16 chars.
  let rand = "";
  for (let i = 0; i < 8; i++) rand += Math.floor(rnd() * 16).toString(16);
  return rand + (_allianceSeq++).toString(16).padStart(8, "0");
}

// ---- reference data taken from the real game ----
const CLUSTERS = [
  { id: 1, name: "G1", description: "9017-9024" },
  { id: 2, name: "G2", description: "401-1215, 2002" },
  { id: 3, name: "G3", description: "1210, 1216-1577" },
  { id: 4, name: "G4", description: "1578-2128, 2130, 2132" },
  { id: 5, name: "G5", description: "2089, 2129-2770" },
  { id: 6, name: "G6🐍", description: "2759, 2762, 2771+" },
];

const FLAGS = [
  { id: 11441000, code: "UN", name: "United Nations", content: "🇺🇳" },
  { id: 11441001, code: "US", name: "America", content: "🇺🇸" },
  { id: 11441002, code: "GB", name: "British", content: "🇬🇧" },
  { id: 11441003, code: "CN", name: "China", content: "🇨🇳" },
  { id: 11441004, code: "FR", name: "French", content: "🇫🇷" },
  { id: 11441005, code: "DE", name: "Germany", content: "🇩🇪" },
  { id: 11441006, code: "JP", name: "Japan", content: "🇯🇵" },
  { id: 11441007, code: "KR", name: "South Korea", content: "🇰🇷" },
  { id: 11441008, code: "MY", name: "Malaysia", content: "🇲🇾" },
  { id: 11441010, code: "RU", name: "Russia", content: "🇷🇺" },
  { id: 11441011, code: "ES", name: "Spain", content: "🇪🇸" },
  { id: 11441012, code: "TH", name: "Thailand", content: "🇹🇭" },
  { id: 11441030, code: "IN", name: "India", content: "🇮🇳" },
  { id: 11441051, code: "CH", name: "Switzerland", content: "🇨🇭" },
];

const NICK_A = ["Night", "Dark", "Iron", "Storm", "Blood", "Frost", "Shadow", "Dragon", "Silent", "Mad", "Holy", "Crimson", "Ghost", "Thunder", "Wild"];
const NICK_B = ["cast", "wolf", "blade", "lord", "reaper", "king", "hunter", "fury", "soul", "fire", "fang", "born", "strike", "heart", "bane"];
const TAGS = ["GODS", "WAR", "KING", "RUS", "USA", "CN1", "VIP", "TOP", "RED", "SUN", "ICE", "FOX", "OWL", "ZEN", "NWO", "BTC"];
const ALLIANCE_NAMES = ["OfAnarchy", "Valhalla", "Phoenix", "Avengers", "Empire", "Nomads", "Templars", "Vikings", "Legion", "Olympus", "Spartans", "Dynasty", "Reborn", "Outlaws", "Sentinels", "Conquest"];

function nickname(): string {
  return pick(NICK_A) + pick(NICK_B) + (rnd() < 0.4 ? String(int(1, 99)) : "");
}

function powerLevel(rank: number): { power: bigint; level: number } {
  // rank 0 = strongest. Spread from ~1.5Q down to ~50T like the real game.
  const base = 1_500_000_000_000_000 - rank * int(800_000_000_000, 1_500_000_000_000);
  const power = BigInt(Math.max(50_000_000_000_000, Math.floor(base + int(-30e12, 30e12))));
  const level = int(40000, 70000) - rank * 30;
  return { power, level: Math.max(1000, level) };
}

function recentDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.characterSnapshot.deleteMany();
  await prisma.allianceSnapshot.deleteMany();
  await prisma.character.deleteMany();
  await prisma.alliance.deleteMany();
  await prisma.server.deleteMany();
  await prisma.segment.deleteMany();
  await prisma.cluster.deleteMany();
  await prisma.flag.deleteMany();

  console.log("Seeding clusters & flags...");
  for (const c of CLUSTERS) await prisma.cluster.create({ data: c });
  for (const f of FLAGS) await prisma.flag.create({ data: f });

  // Server ids roughly grouped by cluster, matching real-looking numbers.
  const serverSpecs: { id: number; clusterId: number }[] = [
    { id: 9024, clusterId: 1 }, { id: 9021, clusterId: 1 }, { id: 9017, clusterId: 1 },
    { id: 401, clusterId: 2 }, { id: 902, clusterId: 2 },
    { id: 1216, clusterId: 3 }, { id: 1450, clusterId: 3 },
    { id: 1578, clusterId: 4 }, { id: 1990, clusterId: 4 },
    { id: 2129, clusterId: 5 }, { id: 2500, clusterId: 5 },
    { id: 2771, clusterId: 6 }, { id: 2900, clusterId: 6 },
  ];

  let charId = 100000;
  const charSnapshots: any[] = [];
  const allianceSnapshots: any[] = [];

  for (const spec of serverSpecs) {
    console.log(`Seeding server ${spec.id}...`);
    const season = int(40, 60);
    const segment = await prisma.segment.create({
      data: {
        season,
        name: `${spec.id} segment`,
        clusterId: spec.clusterId,
      },
    });
    await prisma.server.create({
      data: {
        id: spec.id,
        online: true,
        closed: false,
        cold: rnd() < 0.2,
        season,
        segmentId: segment.id,
        openDate: recentDate(int(800, 1600)),
      },
    });

    const allianceCount = int(5, 8);
    let rank = 0;
    for (let a = 0; a < allianceCount; a++) {
      const allianceId = hexId();
      const memberCount = int(8, 20);
      let alliancePower = 0n;
      const members: { id: number; power: bigint }[] = [];

      // Create the alliance first so character FKs are satisfied.
      await prisma.alliance.create({
        data: {
          id: allianceId,
          name: pick(ALLIANCE_NAMES) + int(1, 99),
          label: pick(TAGS),
          serverId: spec.id,
          power: 0n,
          members: memberCount,
          maxMembers: 100,
          deleted: false,
        },
      });

      for (let m = 0; m < memberCount; m++) {
        const { power, level } = powerLevel(rank++);
        const maxPower = power + BigInt(int(0, 30_000_000_000_000));
        const id = charId++;
        const lastOnlineDays = rnd() < 0.7 ? 0 : int(0, 14);
        members.push({ id, power });
        alliancePower += power;

        await prisma.character.create({
          data: {
            id,
            nickname: nickname(),
            serverId: spec.id,
            allianceId,
            power,
            maxPower,
            level,
            active: lastOnlineDays < 7,
            flagId: pick(FLAGS).id,
            gender: int(0, 1),
            lastOnline: recentDate(lastOnlineDays),
            deleted: false,
            pvpDamage: BigInt(int(0, 90_000_000) * 1_000_000_000),
            pvpRate: Math.round(rnd() * 10000) / 100,
            avatar: `/avatar/cn/${id}/permanent/avatar`,
          },
        });

        // 14 days of power history (slow growth)
        for (let d = 13; d >= 0; d--) {
          const factor = 1 - d * (int(2, 8) / 1000);
          charSnapshots.push({
            characterId: id,
            date: recentDate(d),
            power: BigInt(Math.floor(Number(power) * factor)),
            maxPower,
            level: Math.max(1000, level - d * int(5, 40)),
            pvpDamage: 0n,
            allianceId,
          });
        }
      }

      await prisma.alliance.update({
        where: { id: allianceId },
        data: { power: alliancePower },
      });
      for (let d = 13; d >= 0; d--) {
        allianceSnapshots.push({
          allianceId,
          date: recentDate(d),
          power: BigInt(Math.floor(Number(alliancePower) * (1 - d * 0.004))),
          members: memberCount,
        });
      }
    }
  }

  console.log(`Inserting ${charSnapshots.length} character snapshots...`);
  for (let i = 0; i < charSnapshots.length; i += 500) {
    await prisma.characterSnapshot.createMany({ data: charSnapshots.slice(i, i + 500) });
  }
  console.log(`Inserting ${allianceSnapshots.length} alliance snapshots...`);
  for (let i = 0; i < allianceSnapshots.length; i += 500) {
    await prisma.allianceSnapshot.createMany({ data: allianceSnapshots.slice(i, i + 500) });
  }

  const counts = {
    clusters: await prisma.cluster.count(),
    servers: await prisma.server.count(),
    alliances: await prisma.alliance.count(),
    characters: await prisma.character.count(),
    charSnapshots: await prisma.characterSnapshot.count(),
  };
  console.log("Done:", counts);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
