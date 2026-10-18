import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from "react";
import { products as catalog } from "../data/products";
import type { CartState } from "../types/cart";
import type { Product } from "../types/product";
import { calculateItemCount, calculateSubtotal } from "../utils/cart";
import { parseStoredCart, toStoredCart } from "../utils/parsers";
import { readStorage, STORAGE_KEYS, writeStorage } from "../utils/storage";
import { CartContext, type CartContextValue } from "./cartContextValue";
import { cartReducer } from "./cartReducer";

function initCartState(): CartState {
  const stored = readStorage(STORAGE_KEYS.cart);
  return { items: stored === undefined ? [] : parseStoredCart(stored, catalog) };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, undefined, initCartState);

  // Persist after every change. This also rewrites any outdated or invalid
  // saved data in its cleaned-up form on first load.
  useEffect(() => {
    writeStorage(STORAGE_KEYS.cart, toStoredCart(state.items));
  }, [state.items]);

  const addItem = useCallback((product: Product, size: number, quantity?: number) => {
    dispatch({ type: "ADD_ITEM", payload: { product, size, quantity } });
  }, []);

  const removeItem = useCallback((productId: string, size: number) => {
    dispatch({ type: "REMOVE_ITEM", payload: { productId, size } });
  }, []);

  const updateQuantity = useCallback(
    (productId: string, size: number, quantity: number) => {
      dispatch({ type: "UPDATE_QUANTITY", payload: { productId, size, quantity } });
    },
    [],
  );

  const clearCart = useCallback(() => {
    dispatch({ type: "CLEAR_CART" });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items: state.items,
      itemCount: calculateItemCount(state.items),
      subtotal: calculateSubtotal(state.items),
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [state.items, addItem, removeItem, updateQuantity, clearCart],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
