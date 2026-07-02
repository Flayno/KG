// Normalizes a nickname for accent-insensitive search:
//   "Wéndy" -> "wendy", "LadyﾠSavannah" -> "lady savannah"
// We store this in Character.searchName and match queries against it, because
// SQLite/Postgres LIKE treats "é" and "e" as different characters.
export function normalizeName(s: string): string {
  return (s ?? "")
    .normalize("NFKD") // split letters from diacritics + fold fullwidth/halfwidth
    .replace(/[̀-ͯ]/g, "") // drop combining diacritics
    .replace(/\s+/g, " ") // collapse exotic spaces
    .toLowerCase()
    .trim();
}
