"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useDictionary, useLocale } from "./LocaleProvider";
import type { Locale } from "@/lib/i18n";

const LOCALE_ORDER: Locale[] = ["ru", "en", "de"];

export function LanguageSwitch() {
  const locale = useLocale();
  const t = useDictionary();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const nextLocale = LOCALE_ORDER[(LOCALE_ORDER.indexOf(locale) + 1) % LOCALE_ORDER.length];

  function switchLocale() {
    startTransition(async () => {
      await fetch("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: nextLocale }),
      });
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={switchLocale}
      disabled={pending}
      title={t.lang}
      className="h-8 px-2.5 rounded-lg border border-border text-xs font-bold text-muted hover:text-foreground hover:bg-white/[0.05] disabled:opacity-60"
    >
      {t.otherLang}
    </button>
  );
}
