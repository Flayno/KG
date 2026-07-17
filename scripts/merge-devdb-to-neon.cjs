// Merge the local SQLite prisma/dev.db into the production Neon/Postgres DB.
//
// Usage:
//   NEON_URL="postgresql://..." npm run pg:merge-devdb
//
// This is intentionally an upsert/merge, not a destructive restore. Parent and
// main entity tables are upserted. Snapshot/history rows are replaced only for
// matching natural keys so reruns stay idempotent.
const { DatabaseSync } = require("node:sqlite");
const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

const LOCAL_DB = path.join(__dirname, "..", "prisma", "dev.db");
const POSTGRES_URL = process.env.NEON_URL || process.env.DATABASE_URL;

if (!POSTGRES_URL || !POSTGRES_URL.startsWith("postgres")) {
  console.error("Set NEON_URL to the production Neon/Postgres connection string.");
  process.exit(1);
}

if (!fs.existsSync(LOCAL_DB)) {
  console.error(`Local SQLite DB not found: ${LOCAL_DB}`);
  process.exit(1);
}

const sqlite = new DatabaseSync(LOCAL_DB);
const pg = new Client({
  connectionString: POSTGRES_URL,
  ssl: { rejectUnauthorized: false },
  keepAlive: true,
  connectionTimeoutMillis: 15000,
  query_timeout: 60000,
});

const bool = (v) => v === 1 || v === true || v === "1";
const date = (v) => (v == null ? null : new Date(Number(v)));
const col = (name, map = (v) => v) => ({ name, map });
const bigint = (name) => col(name, (v) => (v == null ? null : String(v)));
const boolean = (name) => col(name, bool);
const datetime = (name) => col(name, date);

function rows(sql) {
  return sqlite.prepare(sql).all();
}

function project(row, cols) {
  const out = {};
  for (const c of cols) out[c.name] = c.map(row[c.name]);
  return out;
}

function placeholders(rowCount, colCount) {
  return Array.from({ length: rowCount }, (_, ri) =>
    `(${Array.from({ length: colCount }, (_, ci) => `$${ri * colCount + ci + 1}`).join(",")})`
  ).join(",");
}

async function batch(items, cols, fn) {
  const perRow = cols.length;
  const size = Math.min(500, Math.max(1, Math.floor(60000 / perRow)));
  let done = 0;
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
    done += Math.min(size, items.length - i);
    process.stdout.write(`\r  ${done}/${items.length}`);
  }
  process.stdout.write("\n");
}

async function upsertTable(table, cols, conflictCols, selectSql) {
  const source = rows(selectSql).map((r) => project(r, cols));
  if (!source.length) {
    console.log(`${table}: 0`);
    return;
  }

  const names = cols.map((c) => c.name);
  const quoted = names.map((n) => `"${n}"`).join(",");
  const updateCols = names.filter((n) => !conflictCols.includes(n));
  const updates = updateCols.map((n) => `"${n}" = EXCLUDED."${n}"`).join(",");
  const conflict = conflictCols.map((n) => `"${n}"`).join(",");

  console.log(`${table}: ${source.length}`);
  await batch(source, cols, async (slice) => {
    const params = slice.flatMap((r) => names.map((n) => r[n]));
    const sql = `
      INSERT INTO "${table}" (${quoted})
      VALUES ${placeholders(slice.length, names.length)}
      ON CONFLICT (${conflict}) DO UPDATE SET ${updates}
    `;
    await pg.query(sql, params);
  });
}

async function replaceNaturalKeyRows(table, cols, keyCols, selectSql) {
  const source = rows(selectSql).map((r) => project(r, cols));
  if (!source.length) {
    console.log(`${table}: 0`);
    return;
  }

  const names = cols.map((c) => c.name);
  const quoted = names.map((n) => `"${n}"`).join(",");
  console.log(`${table}: ${source.length}`);
  await batch(source, cols, async (slice) => {
    const insertParams = slice.flatMap((r) => names.map((n) => r[n]));
    const keyParams = slice.flatMap((r) => keyCols.map((n) => r[n]));
    const keyValues = placeholders(slice.length, keyCols.length);
    const keyAliases = keyCols.map((n) => `"${n}"`).join(",");
    const deleteMatch = keyCols.map((n) => `t."${n}" = v."${n}"`).join(" AND ");

    await pg.query("BEGIN");
    try {
      await pg.query(
        `DELETE FROM "${table}" t USING (VALUES ${keyValues}) AS v(${keyAliases}) WHERE ${deleteMatch}`,
        keyParams
      );
      await pg.query(
        `INSERT INTO "${table}" (${quoted}) VALUES ${placeholders(slice.length, names.length)}`,
        insertParams
      );
      await pg.query("COMMIT");
    } catch (e) {
      await pg.query("ROLLBACK");
      throw e;
    }
  });
}

async function merge() {
  await pg.connect();

  await upsertTable("Cluster", [
    col("id"), col("name"), col("description"),
  ], ["id"], `SELECT id, name, description FROM Cluster`);

  await upsertTable("Segment", [
    col("id"), col("season"), col("name"), col("clusterId"),
  ], ["id"], `SELECT id, season, name, clusterId FROM Segment`);

  await upsertTable("Flag", [
    col("id"), col("code"), col("name"), col("content"),
  ], ["id"], `SELECT id, code, name, content FROM Flag`);

  await upsertTable("Server", [
    col("id"), boolean("online"), boolean("closed"), boolean("cold"), col("season"),
    col("segmentId"), col("openDate"), col("offlineDate"), col("kingId"),
  ], ["id"], `SELECT id, online, closed, cold, season, segmentId, openDate, offlineDate, kingId FROM Server`);

  await upsertTable("Alliance", [
    col("id"), col("name"), col("label"), col("serverId"), bigint("power"), col("members"),
    col("maxMembers"), col("description"), col("logoImage"), col("techLevel"), col("kvkWins"),
    boolean("hostile"), col("hostileReason"), boolean("deleted"), datetime("refreshedAt"),
  ], ["id"], `SELECT id, name, label, serverId, CAST(power AS TEXT) power, members, maxMembers,
      description, logoImage, techLevel, kvkWins, hostile, hostileReason, deleted, refreshedAt
    FROM Alliance`);

  await upsertTable("Character", [
    col("id"), col("nickname"), col("searchName"), col("serverId"), col("allianceId"),
    bigint("power"), bigint("maxPower"), col("level"), boolean("active"), col("flagId"),
    col("gender"), col("lastOnline"), boolean("deleted"), bigint("pvpDamage"), col("pvpRate"),
    col("avatar"), col("allianceRank"), col("allianceRankName"), boolean("blacklisted"),
    col("blacklistReason"), datetime("refreshedAt"), datetime("detailSyncedAt"),
    col("accountKey"), datetime("historySyncedAt"),
  ], ["id"], `SELECT id, nickname, searchName, serverId, allianceId, CAST(power AS TEXT) power,
      CAST(maxPower AS TEXT) maxPower, level, active, flagId, gender, lastOnline, deleted,
      CAST(pvpDamage AS TEXT) pvpDamage, pvpRate, avatar, allianceRank, allianceRankName,
      blacklisted, blacklistReason, refreshedAt, detailSyncedAt, accountKey, historySyncedAt
    FROM Character`);

  await upsertTable("BlPlan", [
    col("id"), col("gridSize"), col("cells"), datetime("updatedAt"),
  ], ["id"], `SELECT id, gridSize, cells, updatedAt FROM BlPlan`);

  await upsertTable("ManualLink", [
    col("id"), col("a"), col("b"),
  ], ["id"], `SELECT id, a, b FROM ManualLink`);

  await upsertTable("CharacterAllianceLink", [
    col("id"), col("characterId"), col("allianceUuid"), col("label"), col("name"), col("date"),
  ], ["characterId", "allianceUuid"], `SELECT id, characterId, allianceUuid, label, name, date FROM CharacterAllianceLink`);

  await upsertTable("CharacterNameHistory", [
    col("id"), col("characterId"), col("name"), col("searchName"), col("date"),
  ], ["characterId", "name"], `SELECT id, characterId, name, searchName, date FROM CharacterNameHistory`);

  await replaceNaturalKeyRows("CharacterSnapshot", [
    col("characterId"), col("date"), bigint("power"), bigint("maxPower"), col("level"),
    bigint("pvpDamage"), col("pvpRate"), bigint("diffDamage"), col("allianceId"),
  ], ["characterId", "date"], `SELECT characterId, date, CAST(power AS TEXT) power, CAST(maxPower AS TEXT) maxPower,
      level, CAST(pvpDamage AS TEXT) pvpDamage, pvpRate, CAST(diffDamage AS TEXT) diffDamage, allianceId
    FROM CharacterSnapshot`);

  await replaceNaturalKeyRows("AllianceSnapshot", [
    col("allianceId"), col("date"), bigint("power"), col("members"),
  ], ["allianceId", "date"], `SELECT allianceId, date, CAST(power AS TEXT) power, members FROM AllianceSnapshot`);

  const counts = await pg.query(`
    SELECT
      (SELECT count(*)::int FROM "Cluster") clusters,
      (SELECT count(*)::int FROM "Server") servers,
      (SELECT count(*)::int FROM "Alliance") alliances,
      (SELECT count(*)::int FROM "Character") characters
  `);
  console.log("Production totals after merge:", counts.rows[0]);
}

merge()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    try { await pg.end(); } catch {}
    try { sqlite.close(); } catch {}
  });
