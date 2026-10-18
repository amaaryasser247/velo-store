/**
 * Runtime validation for data that crosses a trust boundary: API responses and
 * localStorage. TypeScript types are erased at runtime, so every value is
 * treated as `unknown` and checked here before it becomes a typed value.
 */
import type { CartItem, StoredCart } from "../types/cart.ts";
import type { LoginThrottleEntry, StoredSession, StoredUser } from "../types/auth.ts";
import type { DemoOrder, DemoOrderLine, OrderSummary } from "../types/checkout.ts";
import { PRODUCT_CATEGORIES, type Product, type ProductTranslations } from "../types/product.ts";
import type { StoredWishlist } from "../types/wishlist.ts";
import { clampQuantity, getCartItemId, getMaxQuantity, isSizeAvailable } from "./cart.ts";
import {
  isArrayOf,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  isStringIn,
} from "./guards.ts";
import { STORAGE_VERSION } from "./storage.ts";
import { isCountryCode, isShippingMethod } from "./validation.ts";

/* ---------------------------------- products --------------------------------- */

/**
 * Optional localized copy. Malformed entries are rejected like any other
 * untrusted field (the remote catalog shares this parser).
 */
function parseProductTranslations(raw: unknown): ProductTranslations | null | undefined {
  if (raw === undefined) return undefined;
  if (!isRecord(raw)) return null;
  const translations: ProductTranslations = {};
  const rawAr = raw["ar"];
  if (rawAr !== undefined) {
    if (!isRecord(rawAr)) return null;
    const description = rawAr["description"];
    if (typeof description !== "string" || description.trim() === "") return null;
    translations.ar = { description: description.trim() };
  }
  return translations;
}

export function parseProduct(raw: unknown): Product | null {
  if (!isRecord(raw)) return null;

  const { id, title, brand, price, category, description, image } = raw;
  if (!isNonEmptyString(id) || !isNonEmptyString(title) || !isNonEmptyString(brand)) {
    return null;
  }
  if (!isFiniteNumber(price) || price < 0) return null;
  if (!isStringIn(PRODUCT_CATEGORIES, category)) return null;
  if (typeof description !== "string") return null;
  if (!isNonEmptyString(image)) return null;

  const translations = parseProductTranslations(raw["translations"]);
  if (translations === null) return null;

  const rawImages = raw["images"];
  const images = isArrayOf(rawImages, isNonEmptyString) && rawImages.length > 0
    ? rawImages
    : [image];

  const rawSizes = raw["availableSizes"];
  if (!isArrayOf(rawSizes, isFiniteNumber)) return null;
  const availableSizes = [...new Set(rawSizes.filter((size) => size > 0))].sort(
    (a, b) => a - b,
  );
  if (availableSizes.length === 0) return null;

  const rawNew = raw["isNew"];
  if (rawNew !== undefined && typeof rawNew !== "boolean") return null;

  const rawRating = raw["rating"];
  const rawStock = raw["stock"];

  const product: Product = {
    id: id.trim(),
    title: title.trim(),
    brand: brand.trim(),
    price,
    category,
    description,
    image,
    images,
    availableSizes,
    isNew: rawNew ?? false,
  };

  if (translations !== undefined) {
    product.translations = translations;
  }
  if (isFiniteNumber(rawRating) && rawRating >= 0 && rawRating <= 5) {
    product.rating = rawRating;
  }
  if (isFiniteNumber(rawStock) && Number.isInteger(rawStock) && rawStock >= 0) {
    product.stock = rawStock;
  }

  return product;
}

export interface ParsedProductList {
  products: Product[];
  skipped: number;
}

/** Accepts either a bare array or an object with a `products` array. */
export function parseProductList(raw: unknown): ParsedProductList | null {
  const list = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw["products"])
      ? (raw["products"] as unknown[])
      : null;
  if (list === null) return null;

  const seen = new Set<string>();
  const products: Product[] = [];
  let skipped = 0;

  for (const entry of list) {
    const product = parseProduct(entry);
    if (product === null || seen.has(product.id)) {
      skipped += 1;
      continue;
    }
    seen.add(product.id);
    products.push(product);
  }

  return { products, skipped };
}

/* ------------------------------------ cart ----------------------------------- */

export function toStoredCart(items: readonly CartItem[]): StoredCart {
  return {
    version: STORAGE_VERSION,
    items: items.map((item) => ({
      productId: item.product.id,
      size: item.size,
      quantity: item.quantity,
    })),
  };
}

/**
 * Rebuilds cart items from stored entries against the current catalog.
 * Drops entries with unknown products, sizes the product no longer offers,
 * sold-out products and malformed quantities. Unknown versions are discarded.
 */
export function parseStoredCart(raw: unknown, catalog: readonly Product[]): CartItem[] {
  if (!isRecord(raw) || raw["version"] !== STORAGE_VERSION) return [];
  const entries = raw["items"];
  if (!Array.isArray(entries)) return [];

  const byId = new Map(catalog.map((product) => [product.id, product]));
  const merged = new Map<string, CartItem>();

  for (const entry of entries as unknown[]) {
    if (!isRecord(entry)) continue;
    const { productId, size, quantity } = entry;
    if (!isNonEmptyString(productId) || !isFiniteNumber(size) || !isFiniteNumber(quantity)) {
      continue;
    }
    if (!Number.isInteger(quantity) || quantity < 1) continue;

    const product = byId.get(productId);
    if (product === undefined) continue;
    if (!isSizeAvailable(product, size)) continue;
    if (getMaxQuantity(product) < 1) continue;

    const id = getCartItemId(product.id, size);
    const existing = merged.get(id);
    const nextQuantity = clampQuantity((existing?.quantity ?? 0) + quantity, product);
    merged.set(id, { id, product, size, quantity: nextQuantity });
  }

  return [...merged.values()];
}

/* ---------------------------------- wishlist --------------------------------- */

export function toStoredWishlist(productIds: readonly string[]): StoredWishlist {
  return { version: STORAGE_VERSION, productIds: [...productIds] };
}

export function parseStoredWishlist(raw: unknown, catalog: readonly Product[]): string[] {
  if (!isRecord(raw) || raw["version"] !== STORAGE_VERSION) return [];
  const ids = raw["productIds"];
  if (!Array.isArray(ids)) return [];

  const known = new Set(catalog.map((product) => product.id));
  const result: string[] = [];
  for (const id of ids as unknown[]) {
    if (isNonEmptyString(id) && known.has(id) && !result.includes(id)) result.push(id);
  }
  return result;
}

/* ------------------------------------ auth ----------------------------------- */

function parseStoredUser(raw: unknown): StoredUser | null {
  if (!isRecord(raw)) return null;
  const { id, name, email, createdAt, salt, passwordHash, iterations } = raw;
  if (!isNonEmptyString(id) || !isNonEmptyString(name) || !isNonEmptyString(email)) {
    return null;
  }
  if (!isNonEmptyString(createdAt) || Number.isNaN(Date.parse(createdAt))) return null;
  if (!isNonEmptyString(salt) || !isNonEmptyString(passwordHash)) return null;
  if (!isFiniteNumber(iterations) || !Number.isInteger(iterations)) return null;
  // Bounds keep a tampered record from forcing a huge PBKDF2 run.
  if (iterations < 1 || iterations > 10_000_000) return null;
  return { id, name, email, createdAt, salt, passwordHash, iterations };
}

/**
 * Users envelope. `null` means the stored value is not a valid envelope of the
 * current version ("corrupt or outdated"), which callers clean up; an empty
 * array is a valid, empty account list.
 */
export function parseStoredUsers(raw: unknown): StoredUser[] | null {
  if (!isRecord(raw) || raw["version"] !== STORAGE_VERSION) return null;
  const entries = raw["users"];
  if (!Array.isArray(entries)) return null;

  const users: StoredUser[] = [];
  for (const entry of entries as unknown[]) {
    const user = parseStoredUser(entry);
    if (user !== null) users.push(user);
  }
  return users;
}

/** Session envelope; `null` when malformed or of an unknown version. */
export function parseStoredSession(raw: unknown): StoredSession | null {
  if (!isRecord(raw) || raw["version"] !== STORAGE_VERSION) return null;
  const { userId, expiresAt } = raw;
  if (!isNonEmptyString(userId)) return null;
  if (!isFiniteNumber(expiresAt) || expiresAt <= 0) return null;
  return { userId, expiresAt };
}

/**
 * Login-throttle envelope. Malformed entries are dropped individually (a
 * broken counter should not wipe everyone's lock state), while a malformed
 * envelope returns `null` for cleanup.
 */
export function parseStoredThrottle(raw: unknown): Record<string, LoginThrottleEntry> | null {
  if (!isRecord(raw) || raw["version"] !== STORAGE_VERSION) return null;
  const entries = raw["entries"];
  if (!isRecord(entries)) return null;

  const result: Record<string, LoginThrottleEntry> = {};
  for (const [email, entry] of Object.entries(entries)) {
    if (!isRecord(entry)) continue;
    const { failures, lockedUntilMs, updatedAtMs } = entry;
    if (!isFiniteNumber(failures) || !Number.isInteger(failures) || failures < 1) continue;
    if (!isFiniteNumber(lockedUntilMs) || lockedUntilMs < 0) continue;
    if (!isFiniteNumber(updatedAtMs) || updatedAtMs < 0) continue;
    result[email] = { failures, lockedUntilMs, updatedAtMs };
  }
  return result;
}

/* ------------------------------------ order ---------------------------------- */

function parseOrderSummary(raw: unknown): OrderSummary | null {
  if (!isRecord(raw)) return null;
  const { itemCount, subtotal, shipping, tax, total, freeShippingRemaining } = raw;
  if (
    !isFiniteNumber(itemCount) ||
    !isFiniteNumber(subtotal) ||
    !isFiniteNumber(shipping) ||
    !isFiniteNumber(tax) ||
    !isFiniteNumber(total) ||
    !isFiniteNumber(freeShippingRemaining)
  ) {
    return null;
  }
  return { itemCount, subtotal, shipping, tax, total, freeShippingRemaining };
}

function parseOrderLine(raw: unknown): DemoOrderLine | null {
  if (!isRecord(raw)) return null;
  const { productId, title, brand, size, quantity, unitPrice } = raw;
  if (
    !isNonEmptyString(productId) ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(brand) ||
    !isFiniteNumber(size) ||
    !isFiniteNumber(quantity) ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    !isFiniteNumber(unitPrice)
  ) {
    return null;
  }
  return { productId, title, brand, size, quantity, unitPrice };
}

export function parseDemoOrder(raw: unknown): DemoOrder | null {
  if (!isRecord(raw)) return null;
  const { id, placedAt, customer, lines, summary } = raw;

  if (!isNonEmptyString(id) || !isNonEmptyString(placedAt)) return null;
  if (Number.isNaN(Date.parse(placedAt))) return null;
  if (!isRecord(customer)) return null;

  const { fullName, email, city, country, shippingMethod } = customer;
  if (
    !isNonEmptyString(fullName) ||
    !isNonEmptyString(email) ||
    !isNonEmptyString(city) ||
    !isCountryCode(country) ||
    !isShippingMethod(shippingMethod)
  ) {
    return null;
  }

  if (!Array.isArray(lines) || lines.length === 0) return null;
  const parsedLines = (lines as unknown[]).map(parseOrderLine);
  const validLines = parsedLines.filter((line): line is DemoOrderLine => line !== null);
  if (validLines.length !== parsedLines.length) return null;

  const parsedSummary = parseOrderSummary(summary);
  if (parsedSummary === null) return null;

  return {
    id,
    placedAt,
    customer: { fullName, email, city, country, shippingMethod },
    lines: validLines,
    summary: parsedSummary,
  };
}

/* ---------------------------------- primitives ------------------------------- */

export function parseBoolean(raw: unknown): boolean | null {
  return typeof raw === "boolean" ? raw : null;
}
