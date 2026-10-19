import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import Container from "../components/common/Container";
import AboutSection from "../components/home/AboutSection";
import BrandStory from "../components/home/BrandStory";
import FeaturedCollections from "../components/home/FeaturedCollections";
import HeroSection from "../components/home/HeroSection";
import ProductSection from "../components/home/ProductSection";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProducts } from "../hooks/useProducts";
import type { Product } from "../types/product";
import { sortProducts } from "../utils/filters";

const NO_PRODUCTS: readonly Product[] = [];

export default function Home() {
  const { t } = useTranslation();
  useDocumentTitle();
  const { state, reload } = useProducts();
  const products = state.status === "success" ? state.products : NO_PRODUCTS;

  const newArrivals = useMemo(
    () => products.filter((product) => product.isNew).slice(0, 4),
    [products],
  );
  const topRated = useMemo(() => {
    const newIds = new Set(newArrivals.map((product) => product.id));
    return sortProducts(products, "rating")
      .filter((product) => !newIds.has(product.id))
      .slice(0, 4);
  }, [products, newArrivals]);

  return (
    <>
      <HeroSection />

      {/* The hero photo is pinned behind the page (see the backdrop shell in
          HeroSection), so everything after the hero gets its own opaque
          plate: without it the still photo would show through these sections
          on the way past. Same paper the canvas used to show, so the pixels
          below the hero are unchanged. */}
      <div className="bg-paper">
        <AboutSection />
        <FeaturedCollections />

        {state.status === "loading" ? (
          <Container className="py-12">
            <LoadingState count={4} />
          </Container>
        ) : null}

        {state.status === "error" ? (
          <Container className="py-12">
            <ErrorState message={t("error.loadFailed")} onRetry={reload} />
          </Container>
        ) : null}

        {state.status === "success" ? (
          <>
            <ProductSection
              title={t("sections.newArrivalsTitle")}
              description={t("sections.newArrivalsText")}
              products={newArrivals}
              linkTo="/shop?new=1"
              linkLabel={t("sections.newArrivalsLink")}
            />
            <ProductSection
              title={t("sections.topRatedTitle")}
              description={t("sections.topRatedText")}
              products={topRated}
              linkTo="/shop?sort=rating"
              linkLabel={t("sections.topRatedLink")}
            />
          </>
        ) : null}

        <BrandStory />
      </div>
    </>
  );
}
