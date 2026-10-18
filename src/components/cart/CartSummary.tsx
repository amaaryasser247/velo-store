import { useRef, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { isRtl } from "../../i18n";
import { useFormat } from "../../i18n/format";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/gsap";
import { DUR, EASE } from "../../lib/motion";
import type { OrderSummary } from "../../types/checkout";
import { FREE_SHIPPING_THRESHOLD } from "../../utils/cart";

type CartSummaryProps = {
  summary: OrderSummary;
  title?: string;
  children?: ReactNode;
};

export default function CartSummary({ summary, title, children }: CartSummaryProps) {
  const { t } = useTranslation();
  const { price, tPlural } = useFormat();
  const progress = Math.min(100, (summary.subtotal / FREE_SHIPPING_THRESHOLD) * 100);
  const totalRef = useRef<HTMLElement>(null);
  const lastTotal = useRef<number | null>(null);

  // The total pulses whenever its value changes (mount is excluded).
  useGSAP(
    () => {
      const first = lastTotal.current === null;
      const changed = lastTotal.current !== summary.total;
      lastTotal.current = summary.total;
      const total = totalRef.current;
      if (!total || first) {
        // Scale from the row's end edge, whichever side that is.
        if (total) gsap.set(total, { transformOrigin: isRtl() ? "left center" : "right center" });
        return;
      }
      if (!changed || prefersReducedMotion()) return;
      gsap.fromTo(
        total,
        { scale: 1.15 },
        { scale: 1, duration: DUR.pulse, ease: EASE.out, overwrite: true },
      );
    },
    { dependencies: [summary.total], scope: totalRef },
  );

  return (
    <section aria-labelledby="summary-title" className="bg-chalk p-6">
      <h2 id="summary-title" className="type-title text-xl">
        {title ?? t("bag.summaryTitle")}
      </h2>

      {summary.itemCount > 0 ? (
        <div className="mt-5">
          <p className="text-sm">
            {summary.freeShippingRemaining > 0
              ? t("bag.freeAdd", { amount: price(summary.freeShippingRemaining) })
              : t("bag.freeReached")}
          </p>
          <div aria-hidden="true" className="mt-2 h-1.5 bg-ink">
            <div
              className="h-full bg-brand transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <dl className="mt-6 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt>{tPlural("bag.subtotal", summary.itemCount)}</dt>
          <dd className="font-semibold">{price(summary.subtotal)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("bag.shipping")}</dt>
          <dd className="font-semibold">
            {summary.itemCount === 0 ? "-" : summary.shipping === 0 ? t("bag.free") : price(summary.shipping)}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt>{t("bag.tax")}</dt>
          <dd className="font-semibold">{price(summary.tax)}</dd>
        </div>
        <div className="flex justify-between border-t border-fog pt-4 text-base">
          <dt className="font-semibold">{t("bag.total")}</dt>
          <dd ref={totalRef} className="type-title text-xl">
            {price(summary.total)}
          </dd>
        </div>
      </dl>

      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
