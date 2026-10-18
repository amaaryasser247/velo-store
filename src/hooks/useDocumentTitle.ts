import { useEffect } from "react";
import { useTranslation } from "react-i18next";

/** Document titles keep the brand and translate the suffix. */
export function useDocumentTitle(title?: string): void {
  const { t, i18n } = useTranslation();
  useEffect(() => {
    document.title = title ? `${title} | VELO` : t("meta.base");
    // Re-run on language change as well as title change.
  }, [title, t, i18n.resolvedLanguage]);
}
