import { cookies, headers } from "next/headers";
import { isLocale, LOCALE_COOKIE, type Locale } from "@/lib/i18n";

export const detectLocaleFromAcceptLanguage = (headerValue: string | null): Locale => {
  if (!headerValue) return "en";
  const primary = headerValue.split(",")[0]?.trim().toLowerCase() ?? "";
  return primary.startsWith("zh") ? "zh" : "en";
};

export const getServerLocale = (): Locale => {
  const cookieStore = cookies();
  const cookieValue = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(cookieValue)) {
    return cookieValue;
  }

  const headerValue = headers().get("accept-language");
  return detectLocaleFromAcceptLanguage(headerValue);
};
