import { useContext } from "react";
import { WishlistContext, type WishlistContextValue } from "../context/wishlistContextValue";

export function useWishlist(): WishlistContextValue {
  const context = useContext(WishlistContext);
  if (context === null) {
    throw new Error("useWishlist must be used inside a <WishlistProvider>.");
  }
  return context;
}
