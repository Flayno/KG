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
      className={`bg-surface border border-border rounded-lg ${className}`}
    >
      {children}
    </div>
  );
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-muted text-sm mt-1">{subtitle}</p>}
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

const MEDAL = ["#ffd43b", "#ced4da", "#e8956b"];

export function Rank({ n }: { n: number }) {
  const color = n <= 3 ? MEDAL[n - 1] : undefined;
  return (
    <span
      className="inline-flex items-center justify-center min-w-7 font-semibold tabular-nums"
      style={color ? { color } : { color: "var(--muted)" }}
    >
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
    <div className="bg-surface-2 rounded-lg px-4 py-3">
      <div className="text-muted text-xs uppercase tracking-wide">{label}</div>
      <div className="text-xl font-bold mt-0.5 tabular-nums">{value}</div>
      {hint && <div className="text-muted text-xs mt-0.5">{hint}</div>}
    </div>
  );
}

const TAG_COLORS: Record<string, string> = {
  gray: "bg-surface-2 text-muted",
  gold: "bg-yellow-500 text-black",
  orange: "bg-orange-500 text-white",
  red: "bg-red-600 text-white",
  blue: "bg-primary-strong text-white",
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
    <span className="inline-block text-xs font-bold px-1.5 py-0.5 rounded bg-primary-strong text-white">
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
