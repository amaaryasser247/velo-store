import { createContext } from "react";

export interface WishlistContextValue {
  productIds: readonly string[];
  count: number;
  isWishlisted: (productId: string) => boolean;
  toggleItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearWishlist: () => void;
}

/** `null` means "no provider": useWishlist() turns that into a clear error. */
export const WishlistContext = createContext<WishlistContextValue | null>(null);
