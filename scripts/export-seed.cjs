// Export the server-913-relevant subset (everyone ever in a 913 alliance +
// FK dependencies) from local SQLite into a JSON seed the Vercel route imports
// into Neon. Keeps BigInt columns as strings.
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");

const SERVER = 913;
const db = new DatabaseSync(path.join(__dirname, "..", "prisma", "dev.db"));
const all = (sql, ...p) => db.prepare(sql).all(...p);
const inList = (arr) => arr.map(() => "?").join(",");

// 1. server-913 alliances
const a913 = all(`SELECT id FROM Alliance WHERE serverId=${SERVER}`).map((r) => r.id);

// 2. characters ever linked to a 913 alliance ∪ currently in a 913 alliance ∪ on server 913
const linked = all(`SELECT DISTINCT characterId FROM CharacterAllianceLink WHERE allianceUuid IN (${inList(a913)})`, ...a913).map((r) => r.characterId);
const current = all(`SELECT id FROM Character WHERE allianceId IN (${inList(a913)}) OR serverId=${SERVER}`, ...a913).map((r) => r.id);
const charIds = [...new Set([...linked, ...current])];
const cp = inList(charIds);

// 3. character rows (bigints as text)
const characters = all(
  `SELECT id, nickname, searchName, serverId, allianceId,
     CAST(power AS TEXT) power, CAST(maxPower AS TEXT) maxPower, level, active,
     flagId, gender, lastOnline, deleted,
     CAST(pvpDamage AS TEXT) pvpDamage, pvpRate, avatar, allianceRank, allianceRankName,
     blacklisted, blacklistReason, accountKey
   FROM Character WHERE id IN (${cp})`, ...charIds);

// 4. alliances referenced (current alliance of chars ∪ the 913 alliances)
const allianceIds = [...new Set([...characters.map((c) => c.allianceId).filter(Boolean), ...a913])];
const alliances = allianceIds.length ? all(
  `SELECT id, name, label, serverId, CAST(power AS TEXT) power, members, maxMembers,
     description, logoImage, techLevel, kvkWins, hostile, hostileReason, deleted
   FROM Alliance WHERE id IN (${inList(allianceIds)})`, ...allianceIds) : [];

// 5. servers referenced (by chars ∪ alliances)
const serverIds = [...new Set([...characters.map((c) => c.serverId), ...alliances.map((a) => a.serverId)])];
const servers = all(`SELECT id, online, closed, cold, season, segmentId, openDate, offlineDate, kingId FROM Server WHERE id IN (${inList(serverIds)})`, ...serverIds);

// 6. segments + clusters for those servers
const segmentIds = [...new Set(servers.map((s) => s.segmentId))];
const segments = segmentIds.length ? all(`SELECT id, season, name, clusterId FROM Segment WHERE id IN (${inList(segmentIds)})`, ...segmentIds) : [];
const clusterIds = [...new Set(segments.map((s) => s.clusterId))];
const clusters = clusterIds.length ? all(`SELECT id, name, description FROM Cluster WHERE id IN (${inList(clusterIds)})`, ...clusterIds) : [];

// 7. flags for those chars
const flagIds = [...new Set(characters.map((c) => c.flagId).filter((x) => x != null))];
const flags = flagIds.length ? all(`SELECT id, code, name, content FROM Flag WHERE id IN (${inList(flagIds)})`, ...flagIds) : [];

// 8. per-character children
const snapshots = all(
  `SELECT characterId, date, CAST(power AS TEXT) power, CAST(maxPower AS TEXT) maxPower, level,
     CAST(pvpDamage AS TEXT) pvpDamage, pvpRate, CAST(diffDamage AS TEXT) diffDamage, allianceId
   FROM CharacterSnapshot WHERE characterId IN (${cp})`, ...charIds);
const allianceLinks = all(`SELECT characterId, allianceUuid, label, name, date FROM CharacterAllianceLink WHERE characterId IN (${cp})`, ...charIds);
const nameHistory = all(`SELECT characterId, name, searchName, date FROM CharacterNameHistory WHERE characterId IN (${cp})`, ...charIds);

const out = { clusters, segments, servers, flags, alliances, characters, snapshots, allianceLinks, nameHistory };
const file = path.join(__dirname, "..", "prisma", "seed-913.json");
fs.writeFileSync(file, JSON.stringify(out));
const kb = (fs.statSync(file).size / 1024).toFixed(0);
console.log(`Wrote ${file} (${kb} KB)`);
for (const [k, v] of Object.entries(out)) console.log(`  ${k}: ${v.length}`);
