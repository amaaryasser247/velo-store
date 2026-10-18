import type { Product } from "./product";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ProductSource = "local" | "remote";

/**
 * Human-facing note when the catalog is not exactly what was requested,
 * kept structured so the UI can translate it (and pluralize the count).
 */
export type CatalogNotice =
  | { kind: "remoteUnavailable"; detail: string }
  | { kind: "skipped"; count: number };

export interface CatalogResult {
  products: Product[];
  source: ProductSource;
  notice: CatalogNotice | null;
}

export type ProductsState =
  | { status: "loading" }
  | {
      status: "success";
      products: Product[];
      source: ProductSource;
      notice: CatalogNotice | null;
    }
  | { status: "error" };
