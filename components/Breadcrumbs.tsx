import Link from "next/link";

export function Breadcrumbs({
  items,
}: {
  items: { href?: string; label: string }[];
}) {
  return (
    <nav className="text-xs text-muted mb-2 flex flex-wrap items-center gap-1">
      {items.map((it, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <span className="opacity-50">›</span>}
          {it.href ? (
            <Link href={it.href} className="text-muted hover:text-foreground">
              {it.label}
            </Link>
          ) : (
            <span className="text-foreground">{it.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
