// Upload all local former-member/history data to the deployed Vercel app in
// small chunks. The Vercel route writes into Neon close to the database, which
// is much more reliable than doing huge pg imports from this machine.
//
// Usage:
//   VERCEL_IMPORT_URL="https://kg-ten-umber.vercel.app/api/admin/import-chunk" npm run vercel:upload-history
//   ADMIN_KEY="..." VERCEL_IMPORT_URL="https://.../api/admin/import-chunk" npm run vercel:upload-history
const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "..", "prisma", "dev.db"));
const IMPORT_URL = process.env.VERCEL_IMPORT_URL || "https://kg-ten-umber.vercel.app/api/admin/import-chunk";
const ADMIN_KEY = process.env.ADMIN_KEY;
const CHUNK = Number(process.env.UPLOAD_CHUNK || 250);
const START = Number(process.env.UPLOAD_OFFSET || 0);
const RETRIES = Number(process.env.UPLOAD_RETRIES || 3);

const all = (sql, ...params) => db.prepare(sql).all(...params);
const inList = (arr) => arr.map(() => "?").join(",");
const uniq = (arr) => [...new Set(arr.filter((x) => x != null))];
const bool = (v) => v === 1 || v === true || v === "1";

function endpoint() {
  if (!ADMIN_KEY) return IMPORT_URL;
  const url = new URL(IMPORT_URL);
  url.searchParams.set("key", ADMIN_KEY);
  return url.toString();
}

function rowsByIds(table, columns, ids) {
  if (!ids.length) return [];
  return all(`SELECT ${columns} FROM ${table} WHERE id IN (${inList(ids)})`, ...ids);
}

async function post(payload) {
  let lastError;
  for (let attempt = 1; attempt <= RETRIES; attempt += 1) {
    try {
      const res = await fetch(endpoint(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
      return res.json();
    } catch (error) {
      lastError = error;
      if (attempt === RETRIES) break;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }
  throw lastError;
}

async function uploadBaseDeps(ids) {
  const links = all(
    `SELECT characterId, allianceUuid, label, name, date FROM CharacterAllianceLink WHERE characterId IN (${inList(ids)})`,
    ...ids
  );
  const names = all(
    `SELECT characterId, name, searchName, date FROM CharacterNameHistory WHERE characterId IN (${inList(ids)})`,
    ...ids
  );
  const chars = all(
    `SELECT id, nickname, searchName, serverId, allianceId,
       CAST(power AS TEXT) power, CAST(maxPower AS TEXT) maxPower, level, active,
       flagId, gender, lastOnline, deleted, CAST(pvpDamage AS TEXT) pvpDamage,
       pvpRate, avatar, allianceRank, allianceRankName, blacklisted, blacklistReason, accountKey
     FROM Character WHERE id IN (${inList(ids)})`,
    ...ids
  ).map((c) => ({
    ...c,
    active: bool(c.active),
    deleted: bool(c.deleted),
    blacklisted: bool(c.blacklisted),
  }));

  const allianceIds = uniq([...chars.map((c) => c.allianceId), ...links.map((l) => l.allianceUuid)]);
  const alliances = allianceIds.length
    ? all(
        `SELECT id, name, label, serverId, CAST(power AS TEXT) power, members, maxMembers,
           description, logoImage, techLevel, kvkWins, hostile, hostileReason, deleted
         FROM Alliance WHERE id IN (${inList(allianceIds)})`,
        ...allianceIds
      ).map((a) => ({ ...a, hostile: bool(a.hostile), deleted: bool(a.deleted) }))
    : [];

  const serverIds = uniq([...chars.map((c) => c.serverId), ...alliances.map((a) => a.serverId)]);
  const servers = rowsByIds(
    "Server",
    "id, online, closed, cold, season, segmentId, openDate, offlineDate, kingId",
    serverIds
  ).map((s) => ({ ...s, online: bool(s.online), closed: bool(s.closed), cold: bool(s.cold) }));
  const segments = rowsByIds("Segment", "id, season, name, clusterId", uniq(servers.map((s) => s.segmentId)));
  const clusters = rowsByIds("Cluster", "id, name, description", uniq(segments.map((s) => s.clusterId)));
  const flags = rowsByIds("Flag", "id, code, name, content", uniq(chars.map((c) => c.flagId)));

  return post({ clusters, segments, servers, flags, alliances, characters: chars, links, names });
}

async function main() {
  const ids = all("SELECT DISTINCT characterId id FROM CharacterAllianceLink ORDER BY characterId").map((r) => r.id);
  console.log(`Characters with alliance history: ${ids.length}`);
  let done = Math.min(START, ids.length);
  for (let i = START; i < ids.length; i += CHUNK) {
    const chunk = ids.slice(i, i + CHUNK);
    const result = await uploadBaseDeps(chunk);
    done += chunk.length;
    console.log(`[${done}/${ids.length}]`, result);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.close());
