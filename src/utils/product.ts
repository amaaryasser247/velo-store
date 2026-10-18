import type { Locale } from "../i18n/locales";
import type { Product } from "../types/product";

/**
 * The description to show for a product, with the language it is written in.
 * Arabic falls back to the English copy (marked `lang="en"` at the call site)
 * when a product has no Arabic description yet.
 */
export function productDescription(
  product: Product,
  locale: Locale,
): { text: string; lang: "ar" | "en" } {
  if (locale === "ar") {
    const arabic = product.translations?.ar?.description;
    if (arabic !== undefined && arabic.trim() !== "") {
      return { text: arabic, lang: "ar" };
    }
    return { text: product.description, lang: "en" };
  }
  return { text: product.description, lang: "en" };
}
