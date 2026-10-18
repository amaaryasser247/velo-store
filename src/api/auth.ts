/**
 * Demo authentication: the single seam a real backend would replace.
 *
 * - Users live in `velo:users` as a versioned envelope; the session in
 *   `velo:session` (localStorage for 30 days when "remember me" is checked,
 *   sessionStorage for the tab's lifetime when it is not).
 * - Passwords are never stored: PBKDF2-HMAC-SHA-256, 600,000 iterations, a
 *   random 16-byte salt per user, base64-encoded, compared in constant time.
 * - Login is throttled per email: after 5 failures a 30-second lock, doubling
 *   with each further failure (capped), persisted across reloads.
 *
 * `crypto.subtle` requires a secure context; without it every call fails with
 * a friendly, translated error instead of pretending to work.
 *
 * THIS IS NOT REAL SECURITY: anyone with devtools can read or change the
 * stored data. Real authentication needs a server.
 */
import type { ApiResult } from "../types/api";
import type {
  AuthErrorKey,
  AuthUser,
  LoginFormData,
  LoginThrottleEntry,
  SignupFormData,
  StoredSession,
  StoredUser,
} from "../types/auth";
import { normalizeEmail, normalizeName } from "../utils/auth";
import {
  parseStoredSession,
  parseStoredThrottle,
  parseStoredUsers,
} from "../utils/parsers";
import {
  readSessionStorage,
  readStorage,
  removeSessionStorage,
  removeStorage,
  STORAGE_KEYS,
  STORAGE_VERSION,
  writeSessionStorage,
  writeStorage,
} from "../utils/storage";

/** PBKDF2 iteration count for new records; stored per user so it can evolve. */
export const PBKDF2_ITERATIONS = 600_000;

const SALT_BYTES = 16;
const DERIVED_BITS = 256;

/** "Remember me" session lifetime: 30 days in localStorage. */
const SESSION_TTL_REMEMBERED_MS = 30 * 24 * 60 * 60 * 1000;

/** Without "remember me" the session dies with the tab, and after 12 hours regardless. */
const SESSION_TTL_TAB_MS = 12 * 60 * 60 * 1000;

/** Failures at which the lock starts, and the base lock duration. */
const THROTTLE_THRESHOLD = 5;
const THROTTLE_BASE_LOCK_MS = 30_000;

/** Upper bound so the doubling cannot lock a demo user out forever. */
const THROTTLE_MAX_LOCK_MS = 15 * 60 * 1000;

/** Throttle entries neither locked nor touched for this long are pruned. */
const THROTTLE_TTL_MS = 24 * 60 * 60 * 1000;

function fail<T>(error: AuthErrorKey): ApiResult<T> {
  return { ok: false, error };
}

/* ---------------------------------- crypto ---------------------------------- */

function hasWebCrypto(): boolean {
  return (
    typeof crypto !== "undefined" &&
    typeof crypto.subtle !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> | null {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function derivePasswordHash(
  password: string,
  salt: BufferSource,
  iterations: number,
): Promise<string> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    DERIVED_BITS,
  );
  return toBase64(new Uint8Array(bits));
}

/** Constant-time comparison of two base64 digests. */
function constantTimeEqual(a: string, b: string): boolean {
  const bytesA = fromBase64(a);
  const bytesB = fromBase64(b);
  if (bytesA === null || bytesB === null) return false;
  if (bytesA.length !== bytesB.length) return false;
  let difference = 0;
  for (let index = 0; index < bytesA.length; index += 1) {
    difference |= (bytesA[index] ?? 0) ^ (bytesB[index] ?? 0);
  }
  return difference === 0;
}

function createUserId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

/* ---------------------------------- storage --------------------------------- */

function readStoredUsers(): StoredUser[] {
  const raw = readStorage(STORAGE_KEYS.users);
  if (raw === undefined) return [];
  const users = parseStoredUsers(raw);
  if (users === null) {
    // Corrupt or outdated data is ignored and cleaned up, never trusted.
    removeStorage(STORAGE_KEYS.users);
    return [];
  }
  return users;
}

function writeStoredUsers(users: readonly StoredUser[]): boolean {
  return writeStorage(STORAGE_KEYS.users, { version: STORAGE_VERSION, users });
}

function readStoredSession(): StoredSession | null {
  const localRaw = readStorage(STORAGE_KEYS.session);
  if (localRaw !== undefined) {
    const record = parseStoredSession(localRaw);
    if (record !== null) return record;
    removeStorage(STORAGE_KEYS.session);
  }
  const tabRaw = readSessionStorage(STORAGE_KEYS.session);
  if (tabRaw !== undefined) {
    const record = parseStoredSession(tabRaw);
    if (record !== null) return record;
    removeSessionStorage(STORAGE_KEYS.session);
  }
  return null;
}

/** Writes the session into exactly one storage area: the other is cleared. */
function writeStoredSession(userId: string, remember: boolean, now: number): boolean {
  const ttl = remember ? SESSION_TTL_REMEMBERED_MS : SESSION_TTL_TAB_MS;
  const payload = { version: STORAGE_VERSION, userId, expiresAt: now + ttl };
  if (remember) {
    const written = writeStorage(STORAGE_KEYS.session, payload);
    removeSessionStorage(STORAGE_KEYS.session);
    return written;
  }
  const written = writeSessionStorage(STORAGE_KEYS.session, payload);
  removeStorage(STORAGE_KEYS.session);
  return written;
}

function clearStoredSession(): void {
  removeStorage(STORAGE_KEYS.session);
  removeSessionStorage(STORAGE_KEYS.session);
}

function toAuthUser(user: StoredUser): AuthUser {
  return { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt };
}

/**
 * Synchronous session read used to seed the auth context's first render, so a
 * signed-in reload never flashes the anonymous header. No crypto is involved:
 * a session carries only a user id and an expiry.
 */
export function readSessionSync(): AuthUser | null {
  const record = readStoredSession();
  if (record === null) return null;
  if (record.expiresAt <= Date.now()) {
    clearStoredSession();
    return null;
  }
  const user = readStoredUsers().find((candidate) => candidate.id === record.userId);
  if (user === undefined) {
    clearStoredSession();
    return null;
  }
  return toAuthUser(user);
}

/* ---------------------------------- throttle -------------------------------- */

function readThrottleEntries(now: number): Record<string, LoginThrottleEntry> {
  const raw = readStorage(STORAGE_KEYS.loginThrottle);
  if (raw === undefined) return {};
  const entries = parseStoredThrottle(raw);
  if (entries === null) {
    removeStorage(STORAGE_KEYS.loginThrottle);
    return {};
  }
  const pruned: Record<string, LoginThrottleEntry> = {};
  for (const [email, entry] of Object.entries(entries)) {
    if (entry.lockedUntilMs > now || now - entry.updatedAtMs < THROTTLE_TTL_MS) {
      pruned[email] = entry;
    }
  }
  if (Object.keys(pruned).length !== Object.keys(entries).length) {
    writeStorage(STORAGE_KEYS.loginThrottle, { version: STORAGE_VERSION, entries: pruned });
  }
  return pruned;
}

function writeThrottleEntries(entries: Record<string, LoginThrottleEntry>): void {
  writeStorage(STORAGE_KEYS.loginThrottle, { version: STORAGE_VERSION, entries });
}

export interface LoginLockStatus {
  failures: number;
  /** Unix ms; 0 while not locked. */
  lockedUntilMs: number;
  /** Milliseconds left on the current lock; 0 while not locked. */
  remainingMs: number;
}

/** The persisted throttle state for one email; safe to call while typing. */
export function getLoginLockStatus(email: string): LoginLockStatus {
  const now = Date.now();
  const entry = readThrottleEntries(now)[normalizeEmail(email)];
  if (entry === undefined) return { failures: 0, lockedUntilMs: 0, remainingMs: 0 };
  return {
    failures: entry.failures,
    lockedUntilMs: entry.lockedUntilMs,
    remainingMs: Math.max(0, entry.lockedUntilMs - now),
  };
}

function lockDurationMs(failures: number): number {
  if (failures < THROTTLE_THRESHOLD) return 0;
  const doublings = failures - THROTTLE_THRESHOLD;
  return Math.min(THROTTLE_BASE_LOCK_MS * 2 ** doublings, THROTTLE_MAX_LOCK_MS);
}

function registerFailedAttempt(email: string): void {
  const now = Date.now();
  const entries = readThrottleEntries(now);
  const key = normalizeEmail(email);
  const failures = (entries[key]?.failures ?? 0) + 1;
  entries[key] = { failures, lockedUntilMs: now + lockDurationMs(failures), updatedAtMs: now };
  writeThrottleEntries(entries);
}

function clearFailedAttempts(email: string): void {
  const entries = readThrottleEntries(Date.now());
  const key = normalizeEmail(email);
  if (entries[key] === undefined) return;
  delete entries[key];
  writeThrottleEntries(entries);
}

/* ----------------------------------- API ------------------------------------ */

/** True when the email already belongs to a stored account. */
export function isEmailRegistered(email: string): boolean {
  const key = normalizeEmail(email);
  return readStoredUsers().some((user) => user.email === key);
}

export async function signUp(data: SignupFormData): Promise<ApiResult<AuthUser>> {
  if (!hasWebCrypto()) return fail("authError.cryptoUnavailable");

  const email = normalizeEmail(data.email);
  const name = normalizeName(data.name);
  const users = readStoredUsers();
  if (users.some((user) => user.email === email)) return fail("authError.emailTaken");

  try {
    const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
    const passwordHash = await derivePasswordHash(data.password, salt, PBKDF2_ITERATIONS);
    const stored: StoredUser = {
      id: createUserId(),
      name,
      email,
      createdAt: new Date().toISOString(),
      salt: toBase64(salt),
      passwordHash,
      iterations: PBKDF2_ITERATIONS,
    };

    if (!writeStoredUsers([...users, stored])) return fail("authError.storageUnavailable");
    if (!writeStoredSession(stored.id, data.remember, Date.now())) {
      // The account exists but could not be signed in: roll the account back
      // so a retry does not report the confusing "email already registered".
      writeStoredUsers(users);
      return fail("authError.storageUnavailable");
    }
    return { ok: true, data: toAuthUser(stored) };
  } catch {
    return fail("authError.unknown");
  }
}

export async function logIn(data: LoginFormData): Promise<ApiResult<AuthUser>> {
  if (!hasWebCrypto()) return fail("authError.cryptoUnavailable");

  const email = normalizeEmail(data.email);

  // Throttled emails fail fast, before any hashing: the lock is enforced by
  // the store, not by the form.
  if (getLoginLockStatus(email).remainingMs > 0) return fail("authError.locked");

  const user = readStoredUsers().find((candidate) => candidate.email === email);

  try {
    let verified = false;
    if (user === undefined) {
      // A throwaway derivation keeps "no such account" roughly as slow as
      // "wrong password", so timing does not reveal which part was wrong.
      await derivePasswordHash(
        data.password,
        crypto.getRandomValues(new Uint8Array(SALT_BYTES)),
        PBKDF2_ITERATIONS,
      );
    } else {
      const salt = fromBase64(user.salt);
      const hash = salt === null ? null : await derivePasswordHash(data.password, salt, user.iterations);
      verified = hash !== null && constantTimeEqual(hash, user.passwordHash);
    }

    if (user === undefined || !verified) {
      registerFailedAttempt(email);
      // One generic message: never reveal which part was wrong.
      return fail("authError.invalidCredentials");
    }

    clearFailedAttempts(email);
    if (!writeStoredSession(user.id, data.remember, Date.now())) {
      return fail("authError.storageUnavailable");
    }
    return { ok: true, data: toAuthUser(user) };
  } catch {
    return fail("authError.unknown");
  }
}

export async function logOut(): Promise<ApiResult<null>> {
  clearStoredSession();
  return { ok: true, data: null };
}

/**
 * Restores the current session, dropping expired sessions and sessions whose
 * user no longer exists. `data: null` simply means "anonymous".
 */
export async function restoreSession(): Promise<ApiResult<AuthUser | null>> {
  return { ok: true, data: readSessionSync() };
}

/** Removes the account and the session. The bag and wishlist are untouched. */
export async function deleteAccount(userId: string): Promise<ApiResult<null>> {
  const users = readStoredUsers();
  const removed = users.find((user) => user.id === userId);
  const next = users.filter((user) => user.id !== userId);

  if (removed !== undefined && next.length !== users.length) {
    if (!writeStoredUsers(next)) return fail("authError.storageUnavailable");
    clearFailedAttempts(removed.email);
  }
  clearStoredSession();
  return { ok: true, data: null };
}
