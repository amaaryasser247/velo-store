import { Check, Heart, Star } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { findProductById } from "../api/products";
import Button, { ButtonLink } from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import ProductSection from "../components/home/ProductSection";
import ProductGallery from "../components/products/ProductGallery";
import QuantitySelector from "../components/products/QuantitySelector";
import SizeSelector from "../components/products/SizeSelector";
import { SIZE_RUN } from "../data/sizes";
import { fontsReady, gsap, prefersReducedMotion, SplitText, useGSAP } from "../lib/gsap";
import { EASE } from "../lib/motion";
import { useCart } from "../hooks/useCart";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProducts } from "../hooks/useProducts";
import { useWishlist } from "../hooks/useWishlist";
import { useFormat } from "../i18n/format";
import type { Product } from "../types/product";
import { getMaxQuantity } from "../utils/cart";
import { formatSize } from "../utils/currency";
import { FREE_SHIPPING_THRESHOLD } from "../utils/cart";
import { productDescription } from "../utils/product";

type ProductViewProps = {
  product: Product;
  related: readonly Product[];
};

type AddedState = { size: number; quantity: number };

function ProductView({ product, related }: ProductViewProps) {
  const { t } = useTranslation();
  const { price, tPlural, locale } = useFormat();
  const { addItem } = useCart();
  const { isWishlisted, toggleItem } = useWishlist();
  const [size, setSize] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState<AddedState | null>(null);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const maxQuantity = getMaxQuantity(product);
  const soldOut = maxQuantity < 1;
  const lowStock = product.stock !== undefined && product.stock > 0 && product.stock <= 5;
  const wishlisted = isWishlisted(product.id);
  const description = productDescription(product, locale);

  // Page sequence: the image slides in, the title splits in, then price,
  // rating, sizes, quantity and buttons stagger in. Skipped for reduced motion.
  useGSAP(
    () => {
      const root = viewRef.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let cancelled = false;
        const gallery = root.querySelector<HTMLElement>("[data-pd-gallery]");
        const title = root.querySelector<HTMLElement>("[data-pd-title]");
        const blocks = gsap.utils.toArray<HTMLElement>("[data-pd-block]", root);

        // The gallery slides in from the reading-start side; mirrored in RTL.
        const slideFrom = window.matchMedia("(max-width: 1023px)").matches
          ? 0
          : document.documentElement.dir === "rtl"
            ? 28
            : -28;

        const tl = gsap.timeline({ defaults: { ease: EASE.out } });
        if (gallery) {
          tl.fromTo(
            gallery,
            { x: slideFrom, opacity: 0 },
            { x: 0, opacity: 1, duration: 0.55, clearProps: "opacity,transform" },
            0.02,
          );
        }
        if (title) {
          void fontsReady().then(() => {
            if (cancelled || !title.isConnected) return;
            // Word-level splitting only: never pull Arabic apart into characters.
            const split = SplitText.create(title, { type: "words", aria: "auto" });
            gsap.fromTo(
              split.words,
              { yPercent: 60, autoAlpha: 0 },
              {
                yPercent: 0,
                autoAlpha: 1,
                duration: 0.6,
                ease: EASE.out,
                stagger: 0.05,
                onComplete: () => split.revert(),
              },
            );
          });
        }
        if (blocks.length > 0) {
          tl.fromTo(
            blocks,
            { y: 18, autoAlpha: 0 },
            { y: 0, autoAlpha: 1, duration: 0.55, stagger: 0.07 },
            0.2,
          );
        }
        return () => {
          cancelled = true;
        };
      });
      return () => mm.revert();
    },
    { scope: viewRef },
  );

  // Add-to-bag confirmation line rises in when it appears.
  useGSAP(
    () => {
      const line = statusRef.current?.querySelector("p");
      if (!line || !added || prefersReducedMotion()) return;
      gsap.fromTo(
        line,
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: 0.25, ease: EASE.micro, overwrite: true },
      );
    },
    { dependencies: [added], scope: statusRef },
  );

  function handleSizeChange(next: number): void {
    setSize(next);
    setSizeError(false);
    setAdded(null);
  }

  function handleQuantityChange(next: number): void {
    setQuantity(next);
    setAdded(null);
  }

  function handleAddToBag(): void {
    if (size === null) {
      setSizeError(true);
      sizeGroupRef.current?.focus();
      return;
    }
    addItem(product, size, quantity);
    setAdded({ size, quantity });
  }

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label={t("product.breadcrumb")} className="mb-6 text-sm text-graphite">
        <ol className="flex flex-wrap items-center gap-2">
          <li>
            <Link to="/shop" className="underline-offset-4 hover:underline">
              {t("nav.shop")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              to={`/shop?category=${product.category}`}
              className="underline-offset-4 hover:underline"
            >
              {t(`collections.${product.category}`)}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" lang="en" className="text-ink">
            {product.title}
          </li>
        </ol>
      </nav>

      <div ref={viewRef} className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-16">
        <div data-pd-gallery>
          <ProductGallery images={product.images} title={`${product.brand} ${product.title}`} />
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <p data-pd-block className="text-graphite" lang="en">
            {product.brand}
          </p>
          <h1
            data-pd-title
            lang="en"
            dir="ltr"
            className="type-display mt-1 text-[clamp(2.75rem,6vw,4.5rem)] rtl:text-right"
          >
            {product.title}
          </h1>

          <div data-pd-block className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <p className="text-2xl font-semibold">{price(product.price)}</p>
            {product.rating !== undefined ? (
              <p className="inline-flex items-center gap-1.5 text-sm">
                <Star className="size-4 fill-current" aria-hidden="true" />
                <span className="sr-only">{t("product.ratedSr")}</span>
                {product.rating.toFixed(1)}
                <span className="sr-only">{t("product.outOf5Sr")}</span>
              </p>
            ) : (
              <p className="text-sm text-graphite">{t("product.notRated")}</p>
            )}
            {product.isNew ? (
              <span className="bg-accent px-2.5 py-1 text-xs font-semibold text-accent-ink">
                {t("product.new")}
              </span>
            ) : null}
          </div>

          <p
            data-pd-block
            lang={description.lang}
            className="mt-6 max-w-prose leading-relaxed text-graphite"
          >
            {description.text}
          </p>

          <div data-pd-block className="mt-8">
            {soldOut ? (
              <p className="border border-line bg-surface px-4 py-3 font-semibold">{t("product.soldOutNotice")}</p>
            ) : (
              <SizeSelector
                sizeRun={SIZE_RUN}
                availableSizes={product.availableSizes}
                value={size}
                onChange={handleSizeChange}
                error={sizeError ? t("product.sizeRequired") : undefined}
                groupRef={sizeGroupRef}
              />
            )}
          </div>

          {!soldOut ? (
            <div data-pd-block className="mt-6 flex flex-wrap items-center gap-4">
              <QuantitySelector
                value={quantity}
                max={maxQuantity}
                label={t("product.quantityLabel", { title: product.title })}
                onChange={handleQuantityChange}
              />
              <p className="text-sm text-graphite">
                {lowStock ? tPlural("product.stockLeft", product.stock ?? 0) : t("product.inStock")}
              </p>
            </div>
          ) : null}

          <div data-pd-block className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto]">
            <Button size="lg" fullWidth disabled={soldOut} onClick={handleAddToBag}>
              {soldOut ? t("product.soldOut") : t("product.addToBag")}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => toggleItem(product.id)}
              aria-pressed={wishlisted}
              aria-label={wishlisted ? t("product.wishlistRemove") : t("product.wishlistAdd")}
              className="sm:w-14 sm:px-0"
            >
              <Heart
                className="size-5"
                aria-hidden="true"
                fill={wishlisted ? "currentColor" : "none"}
              />
              <span className="sm:sr-only">
                {wishlisted ? t("product.saved") : t("product.save")}
              </span>
            </Button>
          </div>

          <div ref={statusRef} role="status" aria-live="polite" className="mt-4 min-h-12">
            {added ? (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold">
                <span className="inline-flex items-center gap-1.5">
                  <Check className="size-4" aria-hidden="true" />
                  {t("product.addedToBag", {
                    quantity: String(added.quantity),
                    size: formatSize(added.size),
                  })}
                </span>
                <Link to="/cart" className="underline underline-offset-4">
                  {t("product.viewBag")}
                </Link>
              </p>
            ) : null}
          </div>

          <dl data-pd-block className="mt-6 grid gap-4 border-t border-fog pt-6 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold">{t("product.shippingTitle")}</dt>
              <dd className="mt-1 text-graphite">
                {t("product.shippingText", { amount: price(FREE_SHIPPING_THRESHOLD) })}
              </dd>
            </div>
            <div>
              <dt className="font-semibold">{t("product.returnsTitle")}</dt>
              <dd className="mt-1 text-graphite">{t("product.returnsText")}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="-mx-4 mt-8 sm:-mx-6 lg:-mx-10">
        <ProductSection title={t("sections.moreToTry")} products={related} />
      </div>
    </Container>
  );
}

export default function ProductDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { state, reload } = useProducts();

  const product = state.status === "success" ? findProductById(state.products, id) : undefined;
  useDocumentTitle(product ? product.title : t("meta.product"));

  const related = useMemo(() => {
    if (state.status !== "success" || !product) return [];
    const others = state.products.filter((candidate) => candidate.id !== product.id);
    const sameCategory = others.filter((candidate) => candidate.category === product.category);
    const rest = others.filter((candidate) => candidate.category !== product.category);
    return [...sameCategory, ...rest].slice(0, 4);
  }, [state, product]);

  if (state.status === "loading") {
    return (
      <Container className="py-12">
        <LoadingState count={4} label={t("loading.product")} />
      </Container>
    );
  }

  if (state.status === "error") {
    return (
      <Container className="py-12">
        <ErrorState message={t("error.loadFailed")} onRetry={reload} />
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="py-12">
        <EmptyState
          title={t("product.notFoundTitle")}
          description={t("product.notFoundText")}
          action={<ButtonLink to="/shop">{t("product.browseAll")}</ButtonLink>}
        />
      </Container>
    );
  }

  return <ProductView key={product.id} product={product} related={related} />;
}
