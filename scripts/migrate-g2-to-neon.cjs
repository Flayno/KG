// Copy the G2-cluster subset (everyone ever in a G2 alliance + FK deps) from
// local SQLite straight into Neon via the `pg` driver (Prisma can't connect from
// here, but pg can). Idempotent: only inserts characters not already present.
const { DatabaseSync } = require("node:sqlite");
const { Client } = require("pg");
const path = require("path");

const NEON = process.env.NEON_URL;
if (!NEON) { console.error("Set NEON_URL"); process.exit(1); }
const G2_CLUSTER = 2;

const db = new DatabaseSync(path.join(__dirname, "..", "prisma", "dev.db"));
const all = (s, ...p) => db.prepare(s).all(...p);

const bool = (v) => v === 1 || v === true || v === "1";

// Persistent connection; reconnect only when it actually drops.
let pg = null;
async function getClient() {
  if (pg) return pg;
  pg = new Client({ connectionString: NEON, ssl: { rejectUnauthorized: false }, keepAlive: true, connectionTimeoutMillis: 15000, query_timeout: 40000 });
  pg.on("error", () => { pg = null; });
  await pg.connect();
  return pg;
}
async function q(sql, params) {
  for (let attempt = 0; ; attempt++) {
    try { const c = await getClient(); return await c.query(sql, params); }
    catch (e) {
      if (attempt >= 10) throw e;
      try { await pg?.end(); } catch {}
      pg = null;
      await new Promise((r) => setTimeout(r, 800));
    }
  }
}

async function main() {

  // ---- figure out the G2 character set from SQLite ----
  const segIds = all(`SELECT id FROM Segment WHERE clusterId=${G2_CLUSTER}`).map((r) => r.id);
  const segSet = new Set(segIds);
  const g2Servers = new Set(all(`SELECT id, segmentId FROM Server`).filter((s) => segSet.has(s.segmentId)).map((s) => s.id));
  const g2Alliances = new Set(
    all(`SELECT id, serverId FROM Alliance`).filter((a) => g2Servers.has(a.serverId)).map((a) => a.id)
  );

  const charIds = new Set();
  for (const c of all(`SELECT id, allianceId FROM Character`)) {
    if (c.allianceId && g2Alliances.has(c.allianceId)) charIds.add(c.id);
  }
  for (const l of all(`SELECT characterId, allianceUuid FROM CharacterAllianceLink`)) {
    if (g2Alliances.has(l.allianceUuid)) charIds.add(l.characterId);
  }
  console.log(`G2: ${g2Servers.size} servers, ${g2Alliances.size} alliances, ${charIds.size} relevant characters`);

  // ---- skip characters already in Neon ----
  const existing = new Set((await q(`SELECT id FROM "Character"`)).rows.map((r) => r.id));
  const newIds = new Set([...charIds].filter((id) => !existing.has(id)));
  console.log(`Already in Neon: ${existing.size}. New to insert: ${newIds.size}`);

  // ---- character rows (bigints as text) ----
  const chars = all(`SELECT id, nickname, searchName, serverId, allianceId,
      CAST(power AS TEXT) power, CAST(maxPower AS TEXT) maxPower, level, active,
      flagId, gender, lastOnline, deleted, CAST(pvpDamage AS TEXT) pvpDamage, pvpRate,
      avatar, allianceRank, allianceRankName, blacklisted, blacklistReason, accountKey
    FROM Character`).filter((c) => newIds.has(c.id));

  // ---- FK deps referenced by these chars ----
  const allianceIds = new Set(chars.map((c) => c.allianceId).filter(Boolean));
  g2Alliances.forEach((id) => allianceIds.add(id));
  const alliances = all(`SELECT id, name, label, serverId, CAST(power AS TEXT) power, members,
      maxMembers, description, logoImage, techLevel, kvkWins, hostile, hostileReason, deleted
    FROM Alliance`).filter((a) => allianceIds.has(a.id));

  const serverIds = new Set([...chars.map((c) => c.serverId), ...alliances.map((a) => a.serverId)]);
  const servers = all(`SELECT id, online, closed, cold, season, segmentId, openDate, offlineDate, kingId FROM Server`)
    .filter((s) => serverIds.has(s.id));
  const segmentIds = new Set(servers.map((s) => s.segmentId));
  const segments = all(`SELECT id, season, name, clusterId FROM Segment`).filter((s) => segmentIds.has(s.id));
  const clusterIds = new Set(segments.map((s) => s.clusterId));
  const clusters = all(`SELECT id, name, description FROM Cluster`).filter((c) => clusterIds.has(c.id));
  const flagIds = new Set(chars.map((c) => c.flagId).filter((x) => x != null));
  const flags = all(`SELECT id, code, name, content FROM Flag`).filter((f) => flagIds.has(f.id));

  // ---- children (only for new chars) ----
  const snaps = all(`SELECT characterId, date, CAST(power AS TEXT) power, CAST(maxPower AS TEXT) maxPower,
      level, CAST(pvpDamage AS TEXT) pvpDamage, pvpRate, CAST(diffDamage AS TEXT) diffDamage, allianceId
    FROM CharacterSnapshot`).filter((r) => newIds.has(r.characterId));
  const links = all(`SELECT characterId, allianceUuid, label, name, date FROM CharacterAllianceLink`)
    .filter((r) => newIds.has(r.characterId));
  const names = all(`SELECT characterId, name, searchName, date FROM CharacterNameHistory`)
    .filter((r) => newIds.has(r.characterId));

  // ---- batched inserts ----
  async function insert(table, cols, rows, conflict) {
    if (!rows.length) return;
    const perRow = cols.length;
    const batch = Math.min(25, Math.max(1, Math.floor(60000 / perRow)));
    let done = 0;
    for (let i = 0; i < rows.length; i += batch) {
      const slice = rows.slice(i, i + batch);
      const values = [];
      const params = [];
      slice.forEach((row, ri) => {
        const ph = cols.map((_, ci) => `$${ri * perRow + ci + 1}`);
        values.push(`(${ph.join(",")})`);
        cols.forEach((c) => params.push(row[c.name]));
      });
      const colNames = cols.map((c) => `"${c.name}"`).join(",");
      await q(`INSERT INTO "${table}" (${colNames}) VALUES ${values.join(",")} ${conflict}`, params);
      done += slice.length;
      process.stdout.write(`\r  ${table}: ${done}/${rows.length}`);
    }
    process.stdout.write("\n");
  }

  const B = (n) => ({ name: n, b: true }); // boolean marker (unused, pg handles JS bool)
  const map = (rows, fields) => rows.map((r) => {
    const o = {};
    for (const f of fields) o[f.name] = f.bool ? bool(r[f.name]) : (r[f.name] ?? null);
    return o;
  });

  const col = (name, opt = {}) => ({ name, ...opt });

  console.log("Inserting (FK order)…");
  await insert("Cluster", [col("id"), col("name"), col("description")], clusters, "ON CONFLICT (id) DO NOTHING");
  await insert("Segment", [col("id"), col("season"), col("name"), col("clusterId")], segments, "ON CONFLICT (id) DO NOTHING");
  await insert("Server", [col("id"), col("online", { bool: 1 }), col("closed", { bool: 1 }), col("cold", { bool: 1 }), col("season"), col("segmentId"), col("openDate"), col("offlineDate"), col("kingId")], map(servers, [col("id"), col("online", { bool: 1 }), col("closed", { bool: 1 }), col("cold", { bool: 1 }), col("season"), col("segmentId"), col("openDate"), col("offlineDate"), col("kingId")]), "ON CONFLICT (id) DO NOTHING");
  await insert("Flag", [col("id"), col("code"), col("name"), col("content")], flags, "ON CONFLICT (id) DO NOTHING");
  await insert("Alliance", [col("id"), col("name"), col("label"), col("serverId"), col("power"), col("members"), col("maxMembers"), col("description"), col("logoImage"), col("techLevel"), col("kvkWins"), col("hostile", { bool: 1 }), col("hostileReason"), col("deleted", { bool: 1 })], map(alliances, [col("id"), col("name"), col("label"), col("serverId"), col("power"), col("members"), col("maxMembers"), col("description"), col("logoImage"), col("techLevel"), col("kvkWins"), col("hostile", { bool: 1 }), col("hostileReason"), col("deleted", { bool: 1 })]), "ON CONFLICT (id) DO NOTHING");
  await insert("Character", [col("id"), col("nickname"), col("searchName"), col("serverId"), col("allianceId"), col("power"), col("maxPower"), col("level"), col("active", { bool: 1 }), col("flagId"), col("gender"), col("lastOnline"), col("deleted", { bool: 1 }), col("pvpDamage"), col("pvpRate"), col("avatar"), col("allianceRank"), col("allianceRankName"), col("blacklisted", { bool: 1 }), col("blacklistReason"), col("accountKey")], map(chars, [col("id"), col("nickname"), col("searchName"), col("serverId"), col("allianceId"), col("power"), col("maxPower"), col("level"), col("active", { bool: 1 }), col("flagId"), col("gender"), col("lastOnline"), col("deleted", { bool: 1 }), col("pvpDamage"), col("pvpRate"), col("avatar"), col("allianceRank"), col("allianceRankName"), col("blacklisted", { bool: 1 }), col("blacklistReason"), col("accountKey")]), "ON CONFLICT (id) DO NOTHING");
  await insert("CharacterSnapshot", [col("characterId"), col("date"), col("power"), col("maxPower"), col("level"), col("pvpDamage"), col("pvpRate"), col("diffDamage"), col("allianceId")], snaps, "");
  await insert("CharacterAllianceLink", [col("characterId"), col("allianceUuid"), col("label"), col("name"), col("date")], links, "ON CONFLICT (\"characterId\",\"allianceUuid\") DO NOTHING");
  await insert("CharacterNameHistory", [col("characterId"), col("name"), col("searchName"), col("date")], names, "ON CONFLICT (\"characterId\",\"name\") DO NOTHING");

  const total = (await q(`SELECT count(*)::int n FROM "Character"`)).rows[0].n;
  console.log(`Done. Character rows in Neon: ${total}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
