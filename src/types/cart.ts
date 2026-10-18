import type { Product } from "./product.ts";

export interface CartItem {
  /** Stable identifier: the same product in a different size is a separate entry. */
  id: string;
  product: Product;
  size: number;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
}

export type CartAction =
  | {
      type: "ADD_ITEM";
      payload: {
        product: Product;
        size: number;
        quantity?: number;
      };
    }
  | {
      type: "REMOVE_ITEM";
      payload: {
        productId: string;
        size: number;
      };
    }
  | {
      type: "UPDATE_QUANTITY";
      payload: {
        productId: string;
        size: number;
        quantity: number;
      };
    }
  | {
      type: "CLEAR_CART";
    };

/** Shape persisted to localStorage. Product details are re-resolved on restore. */
export interface StoredCartEntry {
  productId: string;
  size: number;
  quantity: number;
}

export interface StoredCart {
  version: number;
  items: StoredCartEntry[];
}
