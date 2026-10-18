import type { CartAction, CartState } from "../types/cart";
import {
  clampQuantity,
  getCartItemId,
  getMaxQuantity,
  isSizeAvailable,
} from "../utils/cart";
import { assertNever } from "../utils/guards";

export const EMPTY_CART: CartState = { items: [] };

export function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { product, size, quantity = 1 } = action.payload;
      if (!isSizeAvailable(product, size)) return state;
      if (getMaxQuantity(product) < 1) return state;

      const id = getCartItemId(product.id, size);
      const existing = state.items.find((item) => item.id === id);

      if (existing) {
        const nextQuantity = clampQuantity(existing.quantity + quantity, product);
        if (nextQuantity === existing.quantity) return state;
        return {
          items: state.items.map((item) =>
            item.id === id ? { ...item, quantity: nextQuantity } : item,
          ),
        };
      }

      return {
        items: [...state.items, { id, product, size, quantity: clampQuantity(quantity, product) }],
      };
    }

    case "REMOVE_ITEM": {
      const id = getCartItemId(action.payload.productId, action.payload.size);
      return { items: state.items.filter((item) => item.id !== id) };
    }

    case "UPDATE_QUANTITY": {
      const { productId, size, quantity } = action.payload;
      const id = getCartItemId(productId, size);

      // A quantity below 1 means the shopper removed the line.
      if (!Number.isFinite(quantity) || quantity < 1) {
        return { items: state.items.filter((item) => item.id !== id) };
      }

      return {
        items: state.items.map((item) =>
          item.id === id
            ? { ...item, quantity: clampQuantity(quantity, item.product) }
            : item,
        ),
      };
    }

    case "CLEAR_CART":
      return EMPTY_CART;

    default:
      return assertNever(action);
  }
}
