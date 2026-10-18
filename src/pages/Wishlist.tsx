import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import Button, { ButtonLink } from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import ProductGrid from "../components/products/ProductGrid";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProducts } from "../hooks/useProducts";
import { useWishlist } from "../hooks/useWishlist";
import { useFormat } from "../i18n/format";
import type { Product } from "../types/product";

export default function Wishlist() {
  const { t } = useTranslation();
  const { tPlural } = useFormat();
  useDocumentTitle(t("meta.wishlist"));
  const { productIds, clearWishlist } = useWishlist();
  const { state, reload } = useProducts();

  const saved = useMemo<Product[]>(() => {
    if (state.status !== "success") return [];
    const byId = new Map(state.products.map((product) => [product.id, product]));
    return productIds.flatMap((id) => {
      const product = byId.get(id);
      return product ? [product] : [];
    });
  }, [state, productIds]);

  return (
    <Container className="py-8 sm:py-12">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-display text-[clamp(3.5rem,11vw,8rem)]">{t("wishlist.title")}</h1>
          <p aria-live="polite" className="mt-3 text-graphite">
            {tPlural("wishlist.saved", productIds.length)}
          </p>
        </div>
        {productIds.length > 0 ? (
          <Button variant="secondary" onClick={clearWishlist}>
            {t("wishlist.clear")}
          </Button>
        ) : null}
      </header>

      <div className="mt-10">
        {productIds.length === 0 ? (
          <EmptyState
            title={t("wishlist.empty")}
            description={t("wishlist.emptyText")}
            action={<ButtonLink to="/shop">{t("wishlist.browse")}</ButtonLink>}
          />
        ) : state.status === "loading" ? (
          <LoadingState count={productIds.length} />
        ) : state.status === "error" ? (
          <ErrorState message={t("error.loadFailed")} onRetry={reload} />
        ) : (
          <ProductGrid products={saved} />
        )}
      </div>
    </Container>
  );
}
