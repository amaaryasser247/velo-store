/** Supported UI languages, as a literal union with a runtime guard. */
export const LOCALES = ["en", "ar"] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}
