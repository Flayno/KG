"use client";

import { createContext, useContext } from "react";
import { getDictionary, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("ru");

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

export function useDictionary() {
  return getDictionary(useLocale());
}
