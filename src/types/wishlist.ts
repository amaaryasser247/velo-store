export interface WishlistState {
  productIds: string[];
}

export type WishlistAction =
  | { type: "ADD_ITEM"; payload: { productId: string } }
  | { type: "REMOVE_ITEM"; payload: { productId: string } }
  | { type: "TOGGLE_ITEM"; payload: { productId: string } }
  | { type: "CLEAR_WISHLIST" };

export interface StoredWishlist {
  version: number;
  productIds: string[];
}
