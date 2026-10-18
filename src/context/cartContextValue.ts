import { createContext } from "react";
import type { CartItem } from "../types/cart";
import type { Product } from "../types/product";

export interface CartContextValue {
  items: readonly CartItem[];
  itemCount: number;
  subtotal: number;
  addItem: (product: Product, size: number, quantity?: number) => void;
  removeItem: (productId: string, size: number) => void;
  updateQuantity: (productId: string, size: number, quantity: number) => void;
  clearCart: () => void;
}

/** `null` means "no provider": useCart() turns that into a clear error. */
export const CartContext = createContext<CartContextValue | null>(null);
