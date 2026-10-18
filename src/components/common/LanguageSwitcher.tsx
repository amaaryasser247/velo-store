import { useTranslation } from "react-i18next";
import { setLocale } from "../../i18n";
import { isLocale } from "../../i18n/locales";

type LanguageSwitcherProps = {
  /** "header" is a compact text button, "menu" sits on the dark mobile panel. */
  variant?: "header" | "menu";
};

/**
 * Shows the OTHER language in its own script ("العربية" while English is
 * active), with the aria-label written in the CURRENT language. Switching is
 * instant and reload-free: bag, filters and half-filled forms survive it.
 */
export default function LanguageSwitcher({ variant = "header" }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const current = isLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "en";
  const next = current === "ar" ? "en" : "ar";
  const label = next === "ar" ? t("language.arabic") : t("language.english");
  const ariaLabel = next === "ar" ? t("language.switchToArabic") : t("language.switchToEnglish");
  const className =
    variant === "header"
      ? "grid h-11 place-items-center rounded-full px-2.5 text-sm font-semibold hover:bg-chalk"
      : "rounded-full bg-on-brand/15 px-4 py-2 text-base font-semibold hover:bg-on-brand/25";

  return (
    <button type="button" onClick={() => setLocale(next)} aria-label={ariaLabel} lang={next} className={className}>
      {label}
    </button>
  );
}
