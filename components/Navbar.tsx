"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { HeaderSearch } from "./HeaderSearch";
import { LanguageSwitch } from "./LanguageSwitch";
import { useDictionary } from "./LocaleProvider";
import {
  IconTrophy, IconLayers, IconSearch, IconScale, IconBan, IconMap, IconWrench,
} from "./icons";

const NAV = [
  { href: "/ratings", key: "ratings", Icon: IconTrophy },
  { href: "/clusters", key: "clusters", Icon: IconLayers },
  { href: "/character/search", key: "search", Icon: IconSearch },
  { href: "/compare", key: "compare", Icon: IconScale },
  { href: "/blacklist", key: "blacklist", Icon: IconBan },
  { href: "/bl", key: "blMap", Icon: IconMap },
  { href: "/tools", key: "tools", Icon: IconWrench },
] as const;

export function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const t = useDictionary();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-background/70 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-2 py-2.5">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg no-underline text-foreground group shrink-0">
            <span className="grad-brand inline-flex items-center justify-center w-9 h-9 rounded-xl text-white text-sm font-extrabold shadow-lg ring-1 ring-white/15 transition-transform group-hover:scale-[1.05]">
              KG
            </span>
            <span className="hidden sm:inline tracking-tight">
              Comp<span className="grad-text">anion</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5 ml-3">
            {NAV.map(({ href, key, Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors ${
                    active
                      ? "bg-primary-strong/15 text-primary ring-1 ring-primary/25"
                      : "text-muted hover:text-foreground hover:bg-white/[0.05]"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{t.nav[key]}</span>
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:block w-44 md:w-60">
              <HeaderSearch />
            </div>
            <LanguageSwitch />
            <button
              aria-label={t.nav.menu}
              onClick={() => setOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/[0.06] text-foreground"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {open && (
          <nav className="lg:hidden pb-3 flex flex-col gap-1">
            {NAV.map(({ href, key, Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm no-underline ${
                  isActive(href) ? "bg-primary-strong/15 text-primary" : "text-muted hover:text-foreground hover:bg-white/[0.05]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.nav[key]}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
