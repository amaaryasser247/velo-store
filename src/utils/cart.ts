import type { CartItem } from "../types/cart.ts";
import type { OrderSummary, ShippingMethod } from "../types/checkout.ts";
import type { Product } from "../types/product.ts";
import { roundCurrency } from "./currency.ts";

export const MAX_LINE_QUANTITY = 10;
/** EGP: demo values for the storefront switch; see README "Data sources". */
export const FREE_SHIPPING_THRESHOLD = 10_000;
/** Egyptian VAT rate applied to the bag subtotal. */
export const TAX_RATE = 0.14;

export const SHIPPING_RATES: Record<ShippingMethod, number> = {
  standard: 600,
  express: 1_400,
};

export function getCartItemId(productId: string, size: number): string {
  return `${productId}::${size}`;
}

/** Highest quantity allowed for a single cart line (0 when sold out). */
export function getMaxQuantity(product: Product): number {
  const stock = product.stock ?? MAX_LINE_QUANTITY;
  return Math.max(0, Math.min(MAX_LINE_QUANTITY, Math.floor(stock)));
}

export function isSizeAvailable(product: Product, size: number): boolean {
  return product.availableSizes.includes(size);
}

/** Clamp to a whole number between 1 and the product's maximum. */
export function clampQuantity(quantity: number, product: Product): number {
  const max = getMaxQuantity(product);
  const whole = Number.isFinite(quantity) ? Math.floor(quantity) : 1;
  return Math.min(Math.max(whole, 1), Math.max(max, 1));
}

export function calculateItemCount(items: readonly CartItem[]): number {
  return items.reduce((total, item) => total + item.quantity, 0);
}

export function calculateSubtotal(items: readonly CartItem[]): number {
  return roundCurrency(
    items.reduce((total, item) => total + item.product.price * item.quantity, 0),
  );
}

export function calculateShipping(
  subtotal: number,
  method: ShippingMethod = "standard",
): number {
  if (subtotal <= 0) return 0;
  if (method === "standard" && subtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_RATES[method];
}

export function calculateOrderSummary(
  items: readonly CartItem[],
  method: ShippingMethod = "standard",
): OrderSummary {
  const subtotal = calculateSubtotal(items);
  const shipping = calculateShipping(subtotal, method);
  const tax = roundCurrency(subtotal * TAX_RATE);

  return {
    itemCount: calculateItemCount(items),
    subtotal,
    shipping,
    tax,
    total: roundCurrency(subtotal + shipping + tax),
    freeShippingRemaining:
      subtotal > 0 ? Math.max(0, roundCurrency(FREE_SHIPPING_THRESHOLD - subtotal)) : 0,
  };
}
