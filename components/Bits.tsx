import Link from "next/link";
import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-surface border border-border rounded-xl shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-5">
      <h1 className="text-2xl sm:text-[1.7rem] font-bold tracking-tight">{title}</h1>
      {subtitle && <p className="text-muted text-sm mt-1.5">{subtitle}</p>}
    </div>
  );
}

function emojiToCodepoints(emoji: string): string {
  return [...emoji]
    .map((c) => c.codePointAt(0)!)
    .filter((cp) => cp !== 0xfe0f) // strip variation selector
    .map((cp) => cp.toString(16))
    .join("-");
}

const TWEMOJI = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg";

export function Flag({
  flag,
  size = 18,
}: {
  flag: { code: string; name: string; content: string } | null;
  size?: number;
}) {
  if (!flag) return null;
  const cp = flag.content ? emojiToCodepoints(flag.content) : "";
  if (!cp) {
    return (
      <span title={flag.name} className="text-muted text-xs">
        {flag.code}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${TWEMOJI}/${cp}.svg`}
      alt={flag.code}
      title={flag.name}
      width={size}
      height={size}
      loading="lazy"
      className="inline-block align-[-0.15em] select-none"
      style={{ width: size, height: size }}
    />
  );
}

export function AllianceTag({
  alliance,
}: {
  alliance: { id: string; label: string } | null;
}) {
  if (!alliance) return <span className="text-muted">—</span>;
  return (
    <Link
      href={`/alliance/${alliance.id}`}
      className="text-muted hover:text-foreground"
    >
      [{alliance.label}]
    </Link>
  );
}

const MEDAL = [
  "bg-amber-400/15 text-amber-300 ring-amber-400/30",
  "bg-slate-300/15 text-slate-200 ring-slate-300/30",
  "bg-orange-400/15 text-orange-300 ring-orange-400/30",
];

export function Rank({ n }: { n: number }) {
  if (n <= 3) {
    return (
      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ring-1 ${MEDAL[n - 1]}`}>
        {n}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center min-w-6 text-subtle font-semibold tabular-nums">
      {n}
    </span>
  );
}

export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-surface-2/60 border border-border rounded-xl px-4 py-3 transition-colors hover:border-border-strong">
      <div className="text-subtle text-[11px] font-semibold uppercase tracking-wider">{label}</div>
      <div className="text-xl font-bold mt-1 font-mono tracking-tight text-foreground">{value}</div>
      {hint && <div className="text-muted text-xs mt-0.5 tabular-nums">{hint}</div>}
    </div>
  );
}

const TAG_COLORS: Record<string, string> = {
  gray: "bg-surface-2 text-muted ring-1 ring-border",
  gold: "bg-amber-400/15 text-amber-300 ring-1 ring-amber-400/25",
  orange: "bg-orange-500/15 text-orange-300 ring-1 ring-orange-500/30",
  red: "bg-red-500/15 text-red-300 ring-1 ring-red-500/30",
  blue: "bg-primary/15 text-primary ring-1 ring-primary/30",
};

export function Tag({
  children,
  color = "gray",
  title,
}: {
  children: ReactNode;
  color?: "gray" | "gold" | "orange" | "red" | "blue";
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${TAG_COLORS[color]}`}
    >
      {children}
    </span>
  );
}

/** Orange pills naming hostile alliances a player was ever in. */
export function HostileTags({
  tags,
}: {
  tags?: { id: string; label: string; name: string }[];
}) {
  if (!tags || tags.length === 0) return null;
  return (
    <>
      {tags.map((t) => (
        <Tag key={t.id} color="orange" title={`Был в недружественном альянсе [${t.label}] ${t.name}`}>
          [{t.label}]
        </Tag>
      ))}
    </>
  );
}

export function RankBadge({ name }: { name?: string | null }) {
  if (!name) return null;
  return (
    <span className="inline-block text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-primary/15 text-primary ring-1 ring-primary/25">
      {name}
    </span>
  );
}

export function BlacklistMark({ reason }: { reason?: string | null }) {
  return (
    <span
      title={reason ? `Чёрный список: ${reason}` : "В чёрном списке"}
      className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-600 text-white text-[10px] font-bold shrink-0"
    >
      !
    </span>
  );
}

export function AllianceEmblem({ src, size = 56 }: { src?: string | null; size?: number }) {
  if (!src)
    return <div className="rounded bg-surface-2 shrink-0" style={{ width: size, height: size }} />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}
