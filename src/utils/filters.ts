import {
  PRODUCT_CATEGORIES,
  SORT_OPTIONS,
  type FilterOptions,
  type Product,
  type ProductFilters,
  type SortOption,
} from "../types/product";
import { isStringIn } from "./guards";

export const DEFAULT_FILTERS: ProductFilters = {
  query: "",
  category: "all",
  brands: [],
  size: null,
  maxPrice: null,
  newOnly: false,
};

export const DEFAULT_SORT: SortOption = "featured";

export function isSortOption(value: unknown): value is SortOption {
  return isStringIn(SORT_OPTIONS, value);
}

function parseNumberParam(value: string | null): number | null {
  if (value === null || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function parseFilters(params: URLSearchParams): {
  filters: ProductFilters;
  sort: SortOption;
} {
  const category = params.get("category");
  const sort = params.get("sort");

  return {
    filters: {
      query: params.get("q") ?? "",
      category: isStringIn(PRODUCT_CATEGORIES, category) ? category : "all",
      brands: params.getAll("brand").filter((brand) => brand.length > 0),
      size: parseNumberParam(params.get("size")),
      maxPrice: parseNumberParam(params.get("max")),
      newOnly: params.get("new") === "1",
    },
    sort: isSortOption(sort) ? sort : DEFAULT_SORT,
  };
}

export function buildSearchParams(
  filters: ProductFilters,
  sort: SortOption,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.query.trim() !== "") params.set("q", filters.query);
  if (filters.category !== "all") params.set("category", filters.category);
  filters.brands.forEach((brand) => params.append("brand", brand));
  if (filters.size !== null) params.set("size", String(filters.size));
  if (filters.maxPrice !== null) params.set("max", String(filters.maxPrice));
  if (filters.newOnly) params.set("new", "1");
  if (sort !== DEFAULT_SORT) params.set("sort", sort);
  return params;
}

export function matchesQuery(product: Product, query: string): boolean {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack =
    `${product.title} ${product.brand} ${product.category} ${product.description}`.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function applyFilters(
  products: readonly Product[],
  filters: ProductFilters,
): Product[] {
  return products.filter((product) => {
    if (!matchesQuery(product, filters.query)) return false;
    if (filters.category !== "all" && product.category !== filters.category) return false;
    if (filters.brands.length > 0 && !filters.brands.includes(product.brand)) return false;
    if (filters.size !== null && !product.availableSizes.includes(filters.size)) return false;
    if (filters.maxPrice !== null && product.price > filters.maxPrice) return false;
    if (filters.newOnly && !product.isNew) return false;
    return true;
  });
}

export function sortProducts(
  products: readonly Product[],
  sort: SortOption,
): Product[] {
  const indexed = products.map((product, index) => ({ product, index }));

  indexed.sort((a, b) => {
    switch (sort) {
      case "featured":
        return a.index - b.index;
      case "newest":
        return Number(b.product.isNew) - Number(a.product.isNew) || a.index - b.index;
      case "price-asc":
        return a.product.price - b.product.price || a.index - b.index;
      case "price-desc":
        return b.product.price - a.product.price || a.index - b.index;
      case "rating":
        return (b.product.rating ?? -1) - (a.product.rating ?? -1) || a.index - b.index;
    }
  });

  return indexed.map(({ product }) => product);
}

export function getFilterOptions(products: readonly Product[]): FilterOptions {
  const brands = [...new Set(products.map((product) => product.brand))].sort((a, b) =>
    a.localeCompare(b),
  );
  const sizes = [...new Set(products.flatMap((product) => product.availableSizes))].sort(
    (a, b) => a - b,
  );
  const prices = products.map((product) => product.price);
  /** EGP price filter works in 250 EGP steps. */
  const priceStep = 250;
  const minPrice = prices.length > 0 ? Math.floor(Math.min(...prices) / priceStep) * priceStep : 0;
  const maxPrice = prices.length > 0 ? Math.ceil(Math.max(...prices) / priceStep) * priceStep : priceStep;

  return { brands, sizes, minPrice, maxPrice };
}

export function countActiveFilters(filters: ProductFilters): number {
  return (
    (filters.category !== "all" ? 1 : 0) +
    filters.brands.length +
    (filters.size !== null ? 1 : 0) +
    (filters.maxPrice !== null ? 1 : 0) +
    (filters.newOnly ? 1 : 0)
  );
}
