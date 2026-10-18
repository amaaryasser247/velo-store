/**
 * Thin, defensive wrappers around localStorage.
 * Reads return `unknown`: callers must validate the data before using it.
 */

export const STORAGE_VERSION = 1;

export const STORAGE_KEYS = {
  cart: "velo:cart",
  wishlist: "velo:wishlist",
  lastOrder: "velo:last-order",
  announcementDismissed: "velo:announcement-dismissed",
  theme: "velo:theme",
  language: "velo:language",
  users: "velo:users",
  session: "velo:session",
  loginThrottle: "velo:login-throttle",
} as const;

/** Returns the parsed JSON value, or `undefined` if missing, unreadable or invalid JSON. */
export function readStorage(key: string): unknown {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** Returns `false` if storage is unavailable (private mode, quota exceeded, ...). */
export function writeStorage(key: string, value: unknown): boolean {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}

/* ------------------------------ sessionStorage ------------------------------
 * "Remember me" unchecked keeps the session in sessionStorage instead, so it
 * dies with the tab. Same defensive contract as above: reads are `unknown`.
 * -------------------------------------------------------------------------- */

/** Returns the parsed JSON value, or `undefined` if missing, unreadable or invalid JSON. */
export function readSessionStorage(key: string): unknown {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (raw === null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

/** Returns `false` if sessionStorage is unavailable (private mode, quota exceeded, ...). */
export function writeSessionStorage(key: string, value: unknown): boolean {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function removeSessionStorage(key: string): void {
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Nothing useful to do if storage is unavailable.
  }
}
