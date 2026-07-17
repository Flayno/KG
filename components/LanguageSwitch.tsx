"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { useDictionary, useLocale } from "./LocaleProvider";
import type { Locale } from "@/lib/i18n";

const LOCALES: { code: Locale; label: string; short: string }[] = [
  { code: "ru", label: "Русский", short: "RU" },
  { code: "en", label: "English", short: "EN" },
  { code: "de", label: "Deutsch", short: "DE" },
];

export function LanguageSwitch() {
  const locale = useLocale();
  const t = useDictionary();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const current = LOCALES.find((item) => item.code === locale) ?? LOCALES[0];

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        disabled={pending}
        title={t.lang}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-8 min-w-14 px-2.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-foreground hover:bg-white/[0.05] disabled:opacity-60 inline-flex items-center justify-center gap-1.5"
      >
        <span>{current.short}</span>
        <span className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-2 w-36 overflow-hidden rounded-lg border border-border bg-surface shadow-xl ring-1 ring-black/40"
        >
          {LOCALES.map((item) => (
            <button
              key={item.code}
              type="button"
              role="menuitemradio"
              aria-checked={item.code === locale}
              onClick={() => switchLocale(item.code)}
              className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition ${
                item.code === locale
                  ? "bg-primary/15 text-foreground"
                  : "text-muted hover:bg-white/[0.05] hover:text-foreground"
              }`}
            >
              <span>{item.label}</span>
              <span className="text-xs font-bold text-primary">{item.short}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
