/**
 * Network access for the product catalog, kept separate from UI components.
 *
 * Local data in `data/products.ts` is always the reliable fallback. A remote
 * source is only used when VITE_PRODUCTS_API_URL is set, and everything it
 * returns is validated at runtime before it reaches the app.
 */
import { products as localProducts } from "../data/products";
import type { ApiResult, CatalogNotice, CatalogResult } from "../types/api";
import type { Product } from "../types/product";
import { parseProductList } from "../utils/parsers";

const REQUEST_TIMEOUT_MS = 8000;

function getRemoteUrl(): string | null {
  const url = import.meta.env.VITE_PRODUCTS_API_URL;
  return typeof url === "string" && url.trim() !== "" ? url.trim() : null;
}

function describeError(error: unknown): string {
  if (error instanceof DOMException && error.name === "TimeoutError") {
    return "the request timed out";
  }
  if (error instanceof Error && error.message !== "") return error.message;
  return "an unknown error occurred";
}

export async function fetchRemoteProducts(
  url: string,
): Promise<ApiResult<{ products: Product[]; skipped: number }>> {
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      return { ok: false, error: `the server responded with status ${response.status}` };
    }

    // Untrusted until validated: the type system cannot check JSON at runtime.
    const payload: unknown = await response.json();
    const parsed = parseProductList(payload);

    if (parsed === null) {
      return { ok: false, error: "the response was not a list of products" };
    }
    if (parsed.products.length === 0) {
      return { ok: false, error: "the response contained no valid products" };
    }

    return { ok: true, data: parsed };
  } catch (error) {
    return { ok: false, error: describeError(error) };
  }
}

function localCatalog(notice: CatalogNotice | null): CatalogResult {
  return { products: localProducts, source: "local", notice };
}

// Without a remote URL the catalog is known synchronously, so first paint
// never has to show a loading state.
let cachedCatalog: CatalogResult | null = getRemoteUrl() === null ? localCatalog(null) : null;
let inFlight: Promise<CatalogResult> | null = null;

export function getCachedCatalog(): CatalogResult | null {
  return cachedCatalog;
}

export function loadCatalog(options: { force?: boolean } = {}): Promise<CatalogResult> {
  if (options.force === true) {
    cachedCatalog = null;
    inFlight = null;
  }
  if (cachedCatalog !== null) return Promise.resolve(cachedCatalog);
  if (inFlight !== null) return inFlight;

  const url = getRemoteUrl();
  const request: Promise<CatalogResult> =
    url === null
      ? Promise.resolve(localCatalog(null))
      : fetchRemoteProducts(url).then((result): CatalogResult => {
          if (!result.ok) {
            return localCatalog({ kind: "remoteUnavailable", detail: result.error });
          }
          const { products, skipped } = result.data;
          return {
            products,
            source: "remote",
            notice: skipped > 0 ? { kind: "skipped", count: skipped } : null,
          };
        });

  inFlight = request.then((catalog) => {
    cachedCatalog = catalog;
    inFlight = null;
    return catalog;
  });
  return inFlight;
}

export function findProductById(
  products: readonly Product[],
  id: string | undefined,
): Product | undefined {
  if (id === undefined) return undefined;
  return products.find((product) => product.id === id);
}
