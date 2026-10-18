import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import CartItemRow from "../components/cart/CartItem";
import CartSummary from "../components/cart/CartSummary";
import Button, { ButtonLink } from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import { useCart } from "../hooks/useCart";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useFormat } from "../i18n/format";
import { gsap, prefersReducedMotion } from "../lib/gsap";
import { DUR, EASE } from "../lib/motion";
import type { CartItem } from "../types/cart";
import { calculateOrderSummary } from "../utils/cart";

type CartLineProps = {
  item: CartItem;
  onRemove: (productId: string, size: number) => void;
  onUpdateQuantity: (productId: string, size: number, quantity: number) => void;
};

/**
 * One bag line. Removing collapses the line's height first (the one place
 * height is animated), then dispatches the removal. With reduced motion - or
 * if anything goes wrong - the removal dispatches immediately, so a line can
 * never be stuck in the bag.
 */
function CartLine({ item, onRemove, onUpdateQuantity }: CartLineProps) {
  const lineRef = useRef<HTMLLIElement>(null);

  function handleRemove(productId: string, size: number): void {
    const line = lineRef.current;
    if (!line || prefersReducedMotion()) {
      onRemove(productId, size);
      return;
    }
    gsap.set(line, { height: line.offsetHeight });
    gsap.to(line, {
      height: 0,
      autoAlpha: 0,
      duration: DUR.collapse,
      ease: EASE.inOut,
      overwrite: true,
      onComplete: () => onRemove(productId, size),
    });
  }

  return (
    <li ref={lineRef} className="overflow-hidden border-t border-fog">
      <CartItemRow item={item} onRemove={handleRemove} onUpdateQuantity={onUpdateQuantity} />
    </li>
  );
}

export default function Cart() {
  const { t } = useTranslation();
  const { tPlural } = useFormat();
  useDocumentTitle(t("meta.bag"));
  const { items, itemCount, removeItem, updateQuantity, clearCart } = useCart();
  const summary = calculateOrderSummary(items);

  return (
    <Container className="py-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-[clamp(3.5rem,11vw,8rem)]">{t("bag.title")}</h1>
          <p aria-live="polite" className="mt-3 text-graphite">
            {tPlural("bag.itemCount", itemCount)}
          </p>
        </div>
        {items.length > 0 ? (
          <Button variant="secondary" onClick={clearCart}>
            {t("bag.clear")}
          </Button>
        ) : null}
      </header>

      <div className="mt-10">
        {items.length === 0 ? (
          <EmptyState
            title={t("bag.empty")}
            description={t("bag.emptyText")}
            action={<ButtonLink to="/shop">{t("bag.emptyButton")}</ButtonLink>}
          />
        ) : (
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-16">
            <ul aria-label={t("bag.itemsAria")} className="border-b border-fog">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                  onUpdateQuantity={updateQuantity}
                />
              ))}
            </ul>

            <div className="lg:sticky lg:top-24 lg:self-start">
              <CartSummary summary={summary}>
                <ButtonLink to="/checkout" size="lg" fullWidth>
                  {t("bag.checkout")}
                </ButtonLink>
                <p className="mt-4 text-center text-sm">
                  <Link to="/shop" className="underline underline-offset-4">
                    {t("bag.keepShopping")}
                  </Link>
                </p>
              </CartSummary>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
