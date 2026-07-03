"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HeaderSearch } from "./HeaderSearch";

const NAV = [
  { href: "/ratings", label: "Рейтинги" },
  { href: "/clusters", label: "Кластеры" },
  { href: "/character/search", label: "Поиск" },
  { href: "/compare", label: "Сравнение" },
  { href: "/blacklist", label: "Чёрный список" },
  { href: "/bl", label: "Карта BL" },
  { href: "/tools", label: "Инструменты" },
];

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-surface/80 backdrop-blur-md supports-[backdrop-filter]:bg-surface/70">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 py-2.5">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg no-underline text-foreground group">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary-strong text-white text-sm font-extrabold shadow-sm ring-1 ring-white/10 transition-transform group-hover:scale-[1.04]">
              KG
            </span>
            <span className="hidden sm:inline tracking-tight">Companion</span>
          </Link>

          <nav className="hidden md:flex items-center gap-0.5 ml-3">
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    active
                      ? "bg-elevated text-foreground"
                      : "text-muted hover:text-foreground hover:bg-surface-2"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block w-44 md:w-64">
              <HeaderSearch />
            </div>
            <button
              aria-label="menu"
              onClick={() => setOpen((o) => !o)}
              className="md:hidden p-2 rounded hover:bg-surface-2 text-foreground"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="md:hidden pb-3 flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="px-3 py-2 rounded text-sm no-underline text-muted hover:text-foreground hover:bg-surface-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
