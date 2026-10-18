import { X } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useLocalStorage } from "../../hooks/useLocalStorage";
import { useFormat } from "../../i18n/format";
import { gsap, useGSAP } from "../../lib/gsap";
import { EASE } from "../../lib/motion";
import { FREE_SHIPPING_THRESHOLD } from "../../utils/cart";
import { parseBoolean } from "../../utils/parsers";
import { STORAGE_KEYS } from "../../utils/storage";

/**
 * On a full page load the bar eases down into place above the header (part of
 * the hero intro window). Client-side navigation never remounts it, so the
 * drop only plays once per load.
 */
export default function AnnouncementBar() {
  const { t } = useTranslation();
  const { price } = useFormat();
  const [dismissed, setDismissed] = useLocalStorage<boolean>(
    STORAGE_KEYS.announcementDismissed,
    false,
    parseBoolean,
  );
  const barRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const bar = barRef.current;
      if (!bar) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          bar,
          { yPercent: -100 },
          { yPercent: 0, duration: 0.6, ease: EASE.intro, clearProps: "transform" },
        );
      });
      return () => mm.revert();
    },
    { scope: barRef },
  );

  if (dismissed) return null;

  const amount = price(FREE_SHIPPING_THRESHOLD);

  return (
    <div ref={barRef} data-theme="dark" className="bg-ink text-on-brand">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-2 text-sm sm:px-6 lg:px-10">
        <p className="mx-auto text-center">{t("announcement.text", { amount })}</p>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label={t("announcement.dismiss")}
          className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-on-brand/15"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
