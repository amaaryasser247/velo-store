/**
 * Auth domain types for the frontend-only demo accounts.
 *
 * The app has no server: "accounts" live in localStorage and the "session"
 * records which user is signed in and until when. Every stored value is
 * untrusted and is validated by `utils/parsers.ts` before it is used.
 *
 * This is NOT real security: anyone with devtools can read or change the
 * stored data. Real authentication needs a server.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** ISO 8601 timestamp of account creation. */
  createdAt: string;
}

/** Persisted user record including the password verifier; never rendered. */
export interface StoredUser extends AuthUser {
  /** Base64 encoding of 16 random bytes. */
  salt: string;
  /** Base64 PBKDF2-HMAC-SHA-256 derived bits. Never a plaintext password. */
  passwordHash: string;
  /** PBKDF2 iteration count used when the record was created. */
  iterations: number;
}

/** Persisted session record (localStorage when "remember me", else sessionStorage). */
export interface StoredSession {
  userId: string;
  /** Unix ms timestamp after which the session is invalid. */
  expiresAt: number;
}

/** One email's failed-login counter for the client-side throttle. */
export interface LoginThrottleEntry {
  failures: number;
  /** Unix ms; 0 while not locked. */
  lockedUntilMs: number;
  /** Unix ms of the last update; used to prune old entries. */
  updatedAtMs: number;
}

export type AuthStatus = "anonymous" | "authenticated";

export type AuthState =
  | { status: "anonymous" }
  | { status: "authenticated"; user: AuthUser };

export type AuthAction =
  | { type: "SIGN_IN"; payload: AuthUser }
  | { type: "SIGN_OUT" };

export interface LoginFormData {
  email: string;
  password: string;
  remember: boolean;
}

export interface SignupFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
  remember: boolean;
}

export const LOGIN_FIELD_ORDER = ["email", "password"] as const;
export type LoginField = (typeof LOGIN_FIELD_ORDER)[number];

export const SIGNUP_FIELD_ORDER = [
  "name",
  "email",
  "password",
  "confirmPassword",
  "acceptTerms",
] as const;
export type SignupField = (typeof SIGNUP_FIELD_ORDER)[number];

export const INITIAL_LOGIN_FORM: LoginFormData = {
  email: "",
  password: "",
  remember: true,
};

export const INITIAL_SIGNUP_FORM: SignupFormData = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
  remember: true,
};

/**
 * Translation keys for auth validation messages. Validators return keys,
 * never sentences - the render layer translates them, so messages follow the
 * active language (and the test script can assert on stable identifiers).
 */
export type AuthValidationMessage =
  | "validation.nameRequired"
  | "validation.nameFormat"
  | "validation.emailRequired"
  | "validation.emailFormat"
  | "validation.emailTaken"
  | "validation.passwordRequired"
  | "validation.passwordLength"
  | "validation.passwordNoSpace"
  | "validation.passwordLowercase"
  | "validation.passwordUppercase"
  | "validation.passwordDigit"
  | "validation.passwordSymbol"
  | "validation.passwordContainsEmail"
  | "validation.passwordCommon"
  | "validation.confirmRequired"
  | "validation.confirmMismatch"
  | "validation.authTerms";

export type LoginFormErrors = Partial<Record<keyof LoginFormData, AuthValidationMessage>>;
export type SignupFormErrors = Partial<Record<keyof SignupFormData, AuthValidationMessage>>;

/** Checklist rule identifiers, in display order. */
export type PasswordRuleId =
  | "length"
  | "noSpace"
  | "lowercase"
  | "uppercase"
  | "digit"
  | "symbol"
  | "noEmail"
  | "notCommon";

/** Short i18n labels for the live password checklist. */
export type PasswordRuleLabel =
  | "auth.ruleLength"
  | "auth.ruleNoSpace"
  | "auth.ruleLowercase"
  | "auth.ruleUppercase"
  | "auth.ruleDigit"
  | "auth.ruleSymbol"
  | "auth.ruleEmail"
  | "auth.ruleCommon";

/**
 * Error keys returned by `api/auth.ts` through the existing `ApiResult`.
 * `isAuthErrorKey` narrows the string back to this union before rendering.
 */
export const AUTH_ERROR_KEYS = [
  "authError.invalidCredentials",
  "authError.emailTaken",
  "authError.locked",
  "authError.cryptoUnavailable",
  "authError.storageUnavailable",
  "authError.unknown",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

export function isAuthErrorKey(value: string): value is AuthErrorKey {
  return (AUTH_ERROR_KEYS as readonly string[]).includes(value);
}
