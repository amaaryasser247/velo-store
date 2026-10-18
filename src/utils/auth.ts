/**
 * Pure helpers shared by the demo auth layer: identifier normalisation and
 * safe post-login redirects. No storage, no crypto, no React - so they are
 * easy to reason about (and to reuse from scripts/tests).
 */

/** Storage and uniqueness key for an email: trimmed, lowercased. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Display/storage name: NFC, trimmed, inner whitespace collapsed to single spaces. */
export function normalizeName(name: string): string {
  return name.normalize("NFC").trim().replace(/\s+/g, " ");
}

/** First word of a normalised name, used for the "Account, <name>" label. */
export function firstNameOf(name: string): string {
  const first = normalizeName(name).split(" ")[0];
  return first === undefined || first === "" ? name : first;
}

/** Single-letter badge initial; `Array.from` keeps surrogate pairs intact. */
export function initialOf(name: string): string {
  const first = Array.from(normalizeName(name))[0];
  return first === undefined ? "?" : first.toLocaleUpperCase();
}

/**
 * A scheme fragment such as "https://" anywhere in the string. A safe
 * redirect path never legitimately contains one.
 */
const SCHEME_PATTERN = /[a-z][a-z0-9+.-]*:\/\//i;

/** True when the string contains a C0 control or DEL; never valid in a route. */
function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code < 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Only a single-slash-prefixed internal path is allowed as a post-login
 * redirect. Rejects protocol-relative URLs (`//evil.com`), backslash tricks
 * (`/\evil.com`, which browsers treat like `//evil.com`), absolute URLs with a
 * scheme, control characters, and anything the URL parser resolves to another
 * origin. Returns `null` when the value is unsafe or empty.
 */
export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const path = value.trim();
  if (path === "" || !path.startsWith("/") || path.startsWith("//")) return null;
  if (path.includes("\\")) return null;
  if (hasControlCharacters(path)) return null;
  if (SCHEME_PATTERN.test(path)) return null;
  try {
    // Belt and braces: if the WHATWG parser would leave our own origin (it
    // resolves `//host`, backslashes, `https:` and friends to other origins),
    // the path is not a plain internal route.
    const resolved = new URL(path, "https://velo.invalid");
    if (resolved.origin !== "https://velo.invalid") return null;
  } catch {
    return null;
  }
  return path;
}
