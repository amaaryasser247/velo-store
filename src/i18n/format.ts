/**
 * Locale-aware formatting: one place that turns numbers, prices, dates,
 * country names and lists into display strings for the active language.
 *
 * Western digits (`-u-nu-latn`) are used in BOTH languages so prices, sizes,
 * SKUs and order numbers always match the Latin product data.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { isLocale, type Locale } from "./locales";

/** One switch for the digit system; change here, applies everywhere. */
const NUMBER_SYSTEM = "latn";

export function intlLocale(locale: Locale): string {
  return locale === "ar" ? `ar-EG-u-nu-${NUMBER_SYSTEM}` : "en-EG";
}

/* --------------------------------- numbers --------------------------------- */

const numberFormatters = new Map<string, Intl.NumberFormat>();

export function formatNumber(value: number, locale: Locale): string {
  const tag = intlLocale(locale);
  let formatter = numberFormatters.get(tag);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag);
    numberFormatters.set(tag, formatter);
  }
  return formatter.format(value);
}

const priceFormatters = new Map<string, Intl.NumberFormat>();

/** EGP, amounts are never converted - only the formatting follows the locale. */
export function formatPrice(amount: number, locale: Locale): string {
  const tag = intlLocale(locale);
  let formatter = priceFormatters.get(tag);
  if (!formatter) {
    formatter = new Intl.NumberFormat(tag, {
      style: "currency",
      currency: "EGP",
      currencyDisplay: "code",
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    priceFormatters.set(tag, formatter);
  }
  return formatter.format(amount);
}

/* ---------------------------------- dates ---------------------------------- */

const dateFormatters = new Map<string, Intl.DateTimeFormat>();

export function formatDate(iso: string, locale: Locale): string {
  const tag = intlLocale(locale);
  let formatter = dateFormatters.get(tag);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(tag, { dateStyle: "long", timeStyle: "short" });
    dateFormatters.set(tag, formatter);
  }
  return formatter.format(new Date(iso));
}

/* ----------------------------- regions and lists ---------------------------- */

type DisplayNamesLike = { of(code: string): string | undefined };
type DisplayNamesCtor = new (locales: string, options: { type: "region" }) => DisplayNamesLike;

const regionFormatters = new Map<string, DisplayNamesLike | null>();

/** Localized country name (e.g. EG -> "Egypt" / "\u0645\u0635\u0631") with an English fallback. */
export function regionName(code: string, locale: Locale, fallback: string): string {
  const tag = intlLocale(locale);
  let formatter = regionFormatters.get(tag);
  if (formatter === undefined) {
    const Ctor = (Intl as unknown as { DisplayNames?: DisplayNamesCtor }).DisplayNames;
    try {
      formatter = Ctor ? new Ctor(tag, { type: "region" }) : null;
    } catch {
      formatter = null;
    }
    regionFormatters.set(tag, formatter);
  }
  if (!formatter) return fallback;
  try {
    return formatter.of(code) ?? fallback;
  } catch {
    return fallback;
  }
}

type ListFormatLike = { format(items: string[]): string };
type ListFormatCtor = new (
  locales: string,
  options: { style: "long"; type: "conjunction" },
) => ListFormatLike;

/** "a, b and c" / Arabic conjunction - used for brand lists in sentences. */
export function listJoin(items: readonly string[], locale: Locale): string {
  const Ctor = (Intl as unknown as { ListFormat?: ListFormatCtor }).ListFormat;
  if (Ctor) {
    try {
      return new Ctor(intlLocale(locale), { style: "long", type: "conjunction" }).format([
        ...items,
      ]);
    } catch {
      /* fall through to the manual join */
    }
  }
  return items.join(locale === "ar" ? "\u0648 " : " and ");
}

/* ---------------------------------- plurals --------------------------------- */

const pluralRules = new Map<Locale, Intl.PluralRules>();

function pluralRulesFor(locale: Locale): Intl.PluralRules {
  let rules = pluralRules.get(locale);
  if (!rules) {
    rules = new Intl.PluralRules(intlLocale(locale));
    pluralRules.set(locale, rules);
  }
  return rules;
}

/** Base keys that exist in both dictionaries with all six plural suffixes. */
export type PluralBase =
  | "nav.wishlistCount"
  | "nav.bagCount"
  | "shop.resultCount"
  | "bag.itemCount"
  | "bag.subtotal"
  | "wishlist.saved"
  | "product.stockLeft"
  | "notices.skipped"
  | "hero.pairs";

export type PluralSuffix = "zero" | "one" | "two" | "few" | "many" | "other";
export type PluralKey = `${PluralBase}_${PluralSuffix}`;

export function pluralKey(base: PluralBase, locale: Locale, count: number): PluralKey {
  return `${base}_${pluralRulesFor(locale).select(count)}`;
}

/* ----------------------------------- hook ----------------------------------- */

export interface Formatters {
  locale: Locale;
  price: (amount: number) => string;
  number: (value: number) => string;
  date: (iso: string) => string;
  /** Localized country name; pass the English name as fallback. */
  region: (code: string, fallback: string) => string;
  list: (items: readonly string[]) => string;
  /** Picks and renders the right plural form of a counted string. */
  tPlural: (base: PluralBase, count: number, params?: Record<string, string>) => string;
}

/**
 * Bound formatters for the active language. Re-renders on language change
 * because it subscribes through `useTranslation`.
 */
export function useFormat(): Formatters {
  const { i18n, t } = useTranslation();
  const locale: Locale = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";

  return useMemo<Formatters>(() => {
    const tDynamic = t as unknown as (key: string, options?: Record<string, string>) => string;
    return {
      locale,
      price: (amount) => formatPrice(amount, locale),
      number: (value) => formatNumber(value, locale),
      date: (iso) => formatDate(iso, locale),
      region: (code, fallback) => regionName(code, locale, fallback),
      list: (items) => listJoin(items, locale),
      tPlural: (base, count, params) => {
        // The count is passed as a formatted STRING, so i18next interpolates it
        // without treating this as one of its own dynamic plural lookups - the
        // plural form is already chosen here via Intl.PluralRules.
        const options: Record<string, string> = { count: formatNumber(count, locale) };
        if (params) {
          for (const key of Object.keys(params)) {
            const value = params[key];
            if (value !== undefined) options[key] = value;
          }
        }
        return tDynamic(pluralKey(base, locale, count), options);
      },
    };
  }, [locale, t]);
}
