// Converts a BL win count into award icons:
//   10 wins = ☀️ (sun), 5 wins = 🌙 (crescent), 1 win = ⭐ (star).
// Rendered in order: suns, then crescents, then stars.
export function awardsFromWins(wins: number) {
  const suns = Math.floor(wins / 10);
  const rem = wins % 10;
  const crescents = Math.floor(rem / 5);
  const stars = rem % 5;
  return { suns, crescents, stars };
}

export function Awards({ wins, size = 22 }: { wins: number; size?: number }) {
  const { suns, crescents, stars } = awardsFromWins(wins);
  const icons: string[] = [
    ...Array(suns).fill("☀️"),
    ...Array(crescents).fill("🌙"),
    ...Array(stars).fill("⭐"),
  ];
  if (icons.length === 0) return <span className="text-muted">—</span>;
  return (
    <span
      className="inline-flex flex-wrap items-center gap-0.5 leading-none select-none"
      style={{ fontSize: size }}
      title={`${wins} побед: ${suns}☀️ ${crescents}🌙 ${stars}⭐`}
    >
      {icons.map((ic, i) => (
        <span key={i}>{ic}</span>
      ))}
    </span>
  );
}
