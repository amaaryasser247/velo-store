import { useCallback, useEffect, useState } from "react";
import { getCachedCatalog, loadCatalog } from "../api/products";
import type { CatalogResult, ProductsState } from "../types/api";

export interface UseProductsResult {
  state: ProductsState;
  reload: () => void;
}

function toSuccess(catalog: CatalogResult): ProductsState {
  return {
    status: "success",
    products: catalog.products,
    source: catalog.source,
    notice: catalog.notice,
  };
}

export function useProducts(): UseProductsResult {
  const [state, setState] = useState<ProductsState>(() => {
    const cached = getCachedCatalog();
    return cached === null ? { status: "loading" } : toSuccess(cached);
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (attempt === 0 && getCachedCatalog() !== null) return undefined;

    let cancelled = false;
    loadCatalog({ force: attempt > 0 })
      .then((catalog) => {
        if (!cancelled) setState(toSuccess(catalog));
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // The UI shows a translated "could not be loaded" message; keep the
        // technical detail in the console for debugging (normal demo runs
        // never reach this path).
        console.error("[velo] catalog load failed:", error);
        setState({ status: "error" });
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }, []);

  return { state, reload };
}
