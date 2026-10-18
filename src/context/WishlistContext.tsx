import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { products as catalog } from "../data/products";
import type { WishlistState } from "../types/wishlist";
import { parseStoredWishlist, toStoredWishlist } from "../utils/parsers";
import { readStorage, STORAGE_KEYS, writeStorage } from "../utils/storage";
import { WishlistContext, type WishlistContextValue } from "./wishlistContextValue";
import { wishlistReducer } from "./wishlistReducer";

function initWishlistState(): WishlistState {
  const stored = readStorage(STORAGE_KEYS.wishlist);
  return { productIds: stored === undefined ? [] : parseStoredWishlist(stored, catalog) };
}

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, undefined, initWishlistState);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.wishlist, toStoredWishlist(state.productIds));
  }, [state.productIds]);

  const toggleItem = useCallback((productId: string) => {
    dispatch({ type: "TOGGLE_ITEM", payload: { productId } });
  }, []);

  const removeItem = useCallback((productId: string) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId } });
  }, []);

  const clearWishlist = useCallback(() => {
    dispatch({ type: "CLEAR_WISHLIST" });
  }, []);

  const value = useMemo<WishlistContextValue>(
    () => ({
      productIds: state.productIds,
      count: state.productIds.length,
      isWishlisted: (productId: string) => state.productIds.includes(productId),
      toggleItem,
      removeItem,
      clearWishlist,
    }),
    [state.productIds, toggleItem, removeItem, clearWishlist],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}
