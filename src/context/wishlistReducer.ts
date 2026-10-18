import type { WishlistAction, WishlistState } from "../types/wishlist";
import { assertNever } from "../utils/guards";

export const EMPTY_WISHLIST: WishlistState = { productIds: [] };

export function wishlistReducer(
  state: WishlistState,
  action: WishlistAction,
): WishlistState {
  switch (action.type) {
    case "ADD_ITEM": {
      const { productId } = action.payload;
      if (state.productIds.includes(productId)) return state;
      return { productIds: [...state.productIds, productId] };
    }

    case "REMOVE_ITEM":
      return {
        productIds: state.productIds.filter((id) => id !== action.payload.productId),
      };

    case "TOGGLE_ITEM": {
      const { productId } = action.payload;
      return state.productIds.includes(productId)
        ? { productIds: state.productIds.filter((id) => id !== productId) }
        : { productIds: [...state.productIds, productId] };
    }

    case "CLEAR_WISHLIST":
      return EMPTY_WISHLIST;

    default:
      return assertNever(action);
  }
}
