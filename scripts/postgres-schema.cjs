/**
 * Generates prisma/schema.postgres.prisma from prisma/schema.prisma by swapping
 * the datasource provider sqlite -> postgresql. Used by the Vercel build and the
 * GitHub Actions importer (cloud reaches Neon; local stays on SQLite).
 *
 * The generated file is gitignored — it's always derived from the source schema,
 * so models never drift.
 */
const fs = require("fs");
const path = require("path");

const src = path.join(__dirname, "..", "prisma", "schema.prisma");
const dst = path.join(__dirname, "..", "prisma", "schema.postgres.prisma");

let schema = fs.readFileSync(src, "utf8");
schema = schema.replace(
  /datasource db \{[\s\S]*?\}/,
  'datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")\n}'
);

fs.writeFileSync(dst, schema);
console.log(`Wrote ${dst} (provider=postgresql)`);
