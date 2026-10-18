import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearchParams } from "react-router-dom";
import Button from "../components/common/Button";
import Container from "../components/common/Container";
import EmptyState from "../components/common/EmptyState";
import ErrorState from "../components/common/ErrorState";
import LoadingState from "../components/common/LoadingState";
import ProductFilterPanel from "../components/products/ProductFilters";
import ProductGrid from "../components/products/ProductGrid";
import ProductSort from "../components/products/ProductSort";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useProducts } from "../hooks/useProducts";
import { useFormat } from "../i18n/format";
import type { Product, ProductFilters, SortOption } from "../types/product";
import { isRecord } from "../utils/guards";
import {
  applyFilters,
  buildSearchParams,
  countActiveFilters,
  DEFAULT_FILTERS,
  getFilterOptions,
  parseFilters,
  sortProducts,
} from "../utils/filters";

const NO_PRODUCTS: readonly Product[] = [];

function wantsSearchFocus(state: unknown): boolean {
  return isRecord(state) && state["focusSearch"] === true;
}

export default function Shop() {
  const { t } = useTranslation();
  const { number, tPlural } = useFormat();
  useDocumentTitle(t("meta.shop"));
  const { state, reload } = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { filters, sort } = useMemo(() => parseFilters(searchParams), [searchParams]);
  const catalog = state.status === "success" ? state.products : NO_PRODUCTS;
  const options = useMemo(() => getFilterOptions(catalog), [catalog]);
  const visible = useMemo(
    () => sortProducts(applyFilters(catalog, filters), sort),
    [catalog, filters, sort],
  );
  const activeCount = countActiveFilters(filters);

  useEffect(() => {
    if (wantsSearchFocus(location.state)) searchRef.current?.focus();
  }, [location.state]);

  function update(nextFilters: ProductFilters, nextSort: SortOption = sort): void {
    setSearchParams(buildSearchParams(nextFilters, nextSort), { replace: true });
  }

  function resetFilters(): void {
    update({ ...DEFAULT_FILTERS, query: filters.query });
  }

  function resetAll(): void {
    update(DEFAULT_FILTERS);
  }

  const heading =
    filters.category !== "all"
      ? t(`collections.${filters.category}`)
      : filters.newOnly
        ? t("shop.newIn")
        : t("shop.title");

  return (
    <Container className="py-8 sm:py-12">
      <header>
        <h1 className="type-display text-[clamp(3.5rem,11vw,8rem)]">{heading}</h1>
        <p aria-live="polite" className="mt-3 text-graphite">
          {state.status === "success" ? tPlural("shop.resultCount", visible.length) : "\u00a0"}
        </p>
      </header>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <label htmlFor="shop-search" className="sr-only">
            {t("shop.searchLabel")}
          </label>
          <Search
            className="pointer-events-none absolute start-4 top-1/2 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <input
            ref={searchRef}
            id="shop-search"
            type="search"
            value={filters.query}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              update({ ...filters, query: event.target.value })
            }
            placeholder={t("shop.searchPlaceholder")}
            autoComplete="off"
            className="h-12 w-full rounded-full border border-line bg-surface ps-11 pe-5 text-base placeholder:text-graphite hover:border-ink"
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 sm:w-56 sm:flex-none">
            <ProductSort value={sort} onChange={(next) => update(filters, next)} />
          </div>
          <Button
            variant="secondary"
            size="field"
            className="lg:hidden"
            aria-expanded={filtersOpen}
            aria-controls="shop-filters"
            onClick={() => setFiltersOpen((open) => !open)}
          >
            <SlidersHorizontal className="size-4" aria-hidden="true" />
            {t("shop.filtersLabel")}
            {activeCount > 0 ? ` (${number(activeCount)})` : ""}
          </Button>
        </div>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside
          id="shop-filters"
          aria-label={t("shop.filtersHeading")}
          className={`${filtersOpen ? "block" : "hidden"} lg:sticky lg:top-24 lg:block lg:self-start`}
        >
          <ProductFilterPanel
            filters={filters}
            options={options}
            onChange={(next) => update(next)}
            onReset={resetFilters}
          />
        </aside>

        <div>
          {state.status === "success" && state.notice ? (
            <p role="status" className="mb-6 border border-line bg-surface px-4 py-3 text-sm">
              {state.notice.kind === "remoteUnavailable"
                ? t("notices.remoteUnavailable", { detail: state.notice.detail })
                : tPlural("notices.skipped", state.notice.count)}
            </p>
          ) : null}

          {state.status === "loading" ? <LoadingState /> : null}

          {state.status === "error" ? (
            <ErrorState message={t("error.loadFailed")} onRetry={reload} />
          ) : null}

          {state.status === "success" && visible.length === 0 ? (
            <EmptyState
              title={t("shop.noMatchTitle")}
              description={t("shop.noMatchText")}
              action={<Button onClick={resetAll}>{t("shop.clearAll")}</Button>}
            />
          ) : null}

          {state.status === "success" && visible.length > 0 ? (
            <ProductGrid products={visible} />
          ) : null}
        </div>
      </div>
    </Container>
  );
}
