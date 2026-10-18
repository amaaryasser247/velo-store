import { Check, Heart, Plus, Star, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useFormat } from "../../i18n/format";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/gsap";
import { EASE } from "../../lib/motion";
import type { Product } from "../../types/product";
import { formatSize } from "../../utils/currency";

type ProductCardProps = {
  product: Product;
  onAddToCart: (product: Product, size: number) => void;
  isWishlisted: boolean;
  onToggleWishlist: (productId: string) => void;
};

export default function ProductCard({
  product,
  onAddToCart,
  isWishlisted,
  onToggleWishlist,
}: ProductCardProps) {
  const { t } = useTranslation();
  const { price, tPlural } = useFormat();
  const [sizesOpen, setSizesOpen] = useState(false);
  const [addedSize, setAddedSize] = useState<number | null>(null);
  const resetTimer = useRef<number | undefined>(undefined);
  const panelId = useId();
  const heartRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const heartFirstRun = useRef(true);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  /** Collapse the size panel, then unmount it. Instant for reduced motion. */
  function closeSizes(): void {
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) {
      setSizesOpen(false);
      return;
    }
    gsap.to(panel, {
      autoAlpha: 0,
      y: 8,
      duration: 0.16,
      ease: EASE.micro,
      overwrite: true,
      onComplete: () => setSizesOpen(false),
    });
  }

  // Quick-add panel rises in on open.
  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          panel,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.2, ease: EASE.micro },
        );
      });
      return () => mm.revert();
    },
    { dependencies: [sizesOpen], scope: panelRef, revertOnUpdate: true },
  );

  // Wishlist heart pop - the one place springy motion is allowed.
  useGSAP(
    () => {
      if (heartFirstRun.current) {
        heartFirstRun.current = false;
        return;
      }
      const heart = heartRef.current;
      if (!heart || prefersReducedMotion()) return;
      gsap.fromTo(
        heart,
        { scale: 0.55 },
        { scale: 1, duration: 0.45, ease: EASE.pop, overwrite: true },
      );
    },
    { dependencies: [isWishlisted], scope: heartRef },
  );

  const soldOut = product.stock === 0;
  const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  const hoverImage = product.images[1];
  const href = `/product/${product.id}`;

  function handleSelectSize(size: number): void {
    onAddToCart(product, size);
    closeSizes();
    setAddedSize(size);
    window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setAddedSize(null), 2200);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape" && sizesOpen) {
      event.stopPropagation();
      closeSizes();
    }
  }

  const toggleLabel = sizesOpen
    ? t("card.closePicker", { title: product.title })
    : addedSize !== null
      ? t("card.addedSize", { size: formatSize(addedSize) })
      : t("card.quickAdd", { title: product.title });

  return (
    <article className="group relative" onKeyDown={handleKeyDown}>
      <div className="relative aspect-[8/5] overflow-hidden bg-plate">
        <Link to={href} className="absolute inset-0 block" tabIndex={-1} aria-hidden="true">
          <img
            src={product.image}
            alt=""
            loading="lazy"
            className={`h-full w-full object-cover mix-blend-multiply ${
              soldOut ? "opacity-50" : ""
            } ${
              hoverImage
                ? "transition-opacity duration-150 delay-150 group-hover:delay-0 group-hover:opacity-0 motion-reduce:transition-none"
                : ""
            }`}
          />
          {hoverImage ? (
            /* The swap is sequential, never a cross-fade: both photos use
               `multiply`, so overlapping opacities would blend the two shoes
               together. Image one fades out, then image two fades in (the
               delays swap on the way out, so it stays clean in reverse). */
            <img
              src={hoverImage}
              alt=""
              loading="lazy"
              className={`absolute inset-0 h-full w-full object-cover opacity-0 mix-blend-multiply transition-opacity duration-150 group-hover:delay-150 motion-reduce:transition-none ${
                soldOut ? "group-hover:opacity-50" : "group-hover:opacity-100"
              }`}
            />
          ) : null}
        </Link>

        {product.isNew && !soldOut ? (
          <span className="absolute start-2 top-2 bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink">
            {t("product.new")}
          </span>
        ) : null}

        {soldOut ? (
          <span className="absolute bottom-2 start-2 bg-surface px-2.5 py-1 text-xs font-semibold">
            {t("product.soldOut")}
          </span>
        ) : null}

        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-pressed={isWishlisted}
          aria-label={
            isWishlisted
              ? t("card.wishlistRemove", { title: product.title })
              : t("card.wishlistAdd", { title: product.title })
          }
          className="absolute end-2 top-2 grid size-10 place-items-center rounded-full bg-surface text-ink hover:bg-ink hover:text-paper"
        >
          <span ref={heartRef} className="grid place-items-center">
            <Heart
              className="size-5"
              aria-hidden="true"
              fill={isWishlisted ? "currentColor" : "none"}
            />
          </span>
        </button>

        {/* Quick add needs room for a size grid, so it is offered on tablet and up. */}
        {!soldOut ? (
          <>
            {sizesOpen ? (
              <div
                ref={panelRef}
                id={panelId}
                role="group"
                aria-label={t("card.chooseSize", { title: product.title })}
                className="absolute bottom-2 start-2 end-14 hidden max-h-[calc(100%-1rem)] flex-wrap gap-1 overflow-y-auto bg-surface p-2 md:flex"
              >
                {product.availableSizes.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleSelectSize(size)}
                    aria-label={t("card.addSize", { size: formatSize(size) })}
                    className="h-8 min-w-9 border border-line px-1.5 text-xs font-semibold hover:border-ink hover:bg-ink hover:text-paper"
                  >
                    {formatSize(size)}
                  </button>
                ))}
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => (sizesOpen ? closeSizes() : setSizesOpen(true))}
              aria-expanded={sizesOpen}
              aria-controls={sizesOpen ? panelId : undefined}
              aria-label={toggleLabel}
              className="absolute bottom-2 end-2 hidden size-10 place-items-center rounded-full bg-ink text-paper hover:bg-graphite md:grid"
            >
              {sizesOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : addedSize !== null ? (
                <Check className="size-5" aria-hidden="true" />
              ) : (
                <Plus className="size-5" aria-hidden="true" />
              )}
            </button>
          </>
        ) : null}
      </div>

      <p className="sr-only" role="status">
        {addedSize !== null
          ? t("card.statusAdded", { title: product.title, size: formatSize(addedSize) })
          : ""}
      </p>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-graphite" lang="en">
            {product.brand}
          </p>
          <h3 className="font-semibold leading-snug" lang="en">
            <Link to={href} className="underline-offset-4 decoration-ring decoration-2 hover:underline">
              {product.title}
            </Link>
          </h3>
        </div>
        <p className="shrink-0 font-semibold">{price(product.price)}</p>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-graphite">
        {product.rating !== undefined ? (
          <span className="inline-flex items-center gap-1">
            <Star className="size-3.5 fill-current" aria-hidden="true" />
            <span className="sr-only">{t("product.ratedSr")}</span>
            {product.rating.toFixed(1)}
            <span className="sr-only">{t("product.outOf5Sr")}</span>
          </span>
        ) : null}
        {lowStock ? <span>{tPlural("product.stockLeft", product.stock ?? 0)}</span> : null}
      </div>
    </article>
  );
}
