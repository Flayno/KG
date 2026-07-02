// Strips in-game rich-text markup from strings like alliance descriptions:
//   <color="yellow"><size=50>Привет</size></color>\n  ->  "Привет"
export function stripGameMarkup(s?: string | null): string {
  if (!s) return "";
  return s
    .replace(/<\/?(color|size|b|i|u|material|quad)[^>]*>/gi, "")
    .replace(/\\n/g, "\n")
    .replace(/\r\n?/g, "\n")
    .trim();
}
