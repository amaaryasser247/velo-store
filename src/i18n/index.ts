/**
 * i18next setup: two bundled locales, typed dictionaries, saved-choice-first
 * detection and a document-level lang/dir swap on every change.
 *
 * `initI18n()` runs before the first render (main.tsx) so the very first
 * paint already has translations; index.html repeats the lang/dir logic
 * inline so the markup is right even before the bundle executes.
 */
import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import ar from "./ar";
import en from "./en";
import { isLocale, type Locale } from "./locales";
import { readStorage, STORAGE_KEYS, writeStorage } from "../utils/storage";

export const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

export function detectInitialLocale(): Locale {
  const stored = readStorage(STORAGE_KEYS.language);
  if (isLocale(stored)) return stored;
  return (navigator.language ?? "").toLowerCase().startsWith("ar") ? "ar" : "en";
}

/** Sets `<html lang>` and `<html dir>` - the single switch for all RTL logic. */
export function applyDocumentLocale(locale: Locale): void {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
}

export function initI18n(): void {
  const locale = detectInitialLocale();
  if (!i18next.isInitialized) {
    void i18next.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: "en",
      defaultNS: "translation",
      interpolation: { escapeValue: false },
      initAsync: false,
      returnNull: false,
    });
  }
  applyDocumentLocale(locale);
}

/** Switches language without a reload: state, bag, wishlist and forms survive. */
export function setLocale(locale: Locale): void {
  writeStorage(STORAGE_KEYS.language, locale);
  applyDocumentLocale(locale);
  void i18next.changeLanguage(locale);
}

/** Non-hook access for callbacks (GSAP setup, plural helpers outside render). */
export function currentLocale(): Locale {
  const resolved = i18next.resolvedLanguage;
  return isLocale(resolved) ? resolved : "en";
}

/** True while the document renders right-to-left (used to mirror travel). */
export function isRtl(): boolean {
  return currentLocale() === "ar";
}

/** Non-React access to `t()` (class components, e.g. the error boundary). */
export default i18next;
