"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Tabs({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 border-b border-border mb-4 overflow-x-auto">
      {items.map((it) => {
        const active = pathname === it.href;
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 -mb-px no-underline transition-colors ${
              active
                ? "border-primary text-foreground font-medium"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}
