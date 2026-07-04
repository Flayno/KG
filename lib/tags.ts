// Blacklist reasons are stored as a JSON array of tags in Character.blacklistReason.
// Legacy plain-string reasons are treated as a single tag.

export function parseTags(s?: string | null): string[] {
  if (!s) return [];
  try {
    const a = JSON.parse(s);
    if (Array.isArray(a)) return a.filter(Boolean).map(String);
  } catch {
    /* legacy plain string */
  }
  return [s];
}

export function stringifyTags(tags: string[]): string {
  return JSON.stringify([...new Set(tags.map((t) => t.trim()).filter(Boolean))]);
}

// Standard tag catalog. Blacklist uses the negative set (all reasons are negative).
export const NEGATIVE_TAGS = [
  "Недружественный игрок",
  "Предатель",
  "Помогал секте",
  "Друг кастера",
  "Неактивный",
  "Пропал во время BL",
  "Шпион",
  "Токсик",
  "Слил альянс",
];

export const POSITIVE_TAGS = [
  "Активный игрок",
  "Надёжный",
  "Хороший боец",
  "Донатер",
  "Помогает альянсу",
];

// Blacklist preset tags = the negative catalog.
export const PRESET_TAGS = NEGATIVE_TAGS;
