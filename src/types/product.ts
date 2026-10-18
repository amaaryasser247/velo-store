export const PRODUCT_CATEGORIES = [
  "running",
  "basketball",
  "lifestyle",
  "training",
  "skate",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export type CategoryFilter = ProductCategory | "all";

export const SORT_OPTIONS = [
  "featured",
  "newest",
  "price-asc",
  "price-desc",
  "rating",
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number];

export interface ProductCategoryTranslations {
  /** Localized description; falls back to the English one with lang="en". */
  description: string;
}

export interface ProductTranslations {
  ar?: ProductCategoryTranslations;
}

export interface Product {
  id: string;
  title: string;
  brand: string;
  price: number;
  category: ProductCategory;
  description: string;
  /** Optional localized copy (currently Arabic descriptions). */
  translations?: ProductTranslations;
  image: string;
  images: string[];
  availableSizes: number[];
  rating?: number;
  stock?: number;
  isNew: boolean;
}

export interface ProductFilters {
  query: string;
  category: CategoryFilter;
  brands: string[];
  size: number | null;
  /** `null` means no upper price limit. */
  maxPrice: number | null;
  newOnly: boolean;
}

export interface FilterOptions {
  brands: string[];
  sizes: number[];
  minPrice: number;
  maxPrice: number;
}
