import { cookies } from "next/headers";
import { DEFAULT_LOCALE, getDictionary, isLocale, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const locale = store.get("kg-locale")?.value;
  return isLocale(locale) ? locale : DEFAULT_LOCALE;
}

export async function getServerDictionary() {
  return getDictionary(await getLocale());
}
