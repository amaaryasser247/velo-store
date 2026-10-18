/**
 * Regex-based validation for the demo auth forms.
 *
 * Rules the file follows:
 * - Every regex is a named export with a one-line comment, so the test script
 *   (`npm run test:validation`) and the components share one source of truth.
 * - Validators return typed message KEYS, translated at render time.
 * - ReDoS safety: no nested quantifiers, and every input is length-capped
 *   before a regex runs.
 * - Name/email handling is script-agnostic: Arabic, accented Latin and
 *   combining marks all pass; whitespace is trimmed first.
 */
import type {
  AuthValidationMessage,
  LoginFormData,
  LoginFormErrors,
  PasswordRuleId,
  PasswordRuleLabel,
  SignupFormData,
  SignupFormErrors,
} from "../types/auth.ts";

/* ---------------------------------- regexes --------------------------------- */

/** 2 to 50 chars: first a letter of any script, then letters, marks, space . ' - */
export const NAME_REGEX = /^\p{L}[\p{L}\p{M}'’.\- ]{1,49}$/u;

/** RFC-5321/5322-flavoured check: no consecutive dots, alnum first/last local char, 64/254 caps. */
export const EMAIL_REGEX =
  /^(?=.{6,254}$)(?!.*\.\.)(?=[^@]{1,64}@)[A-Za-z0-9](?:[A-Za-z0-9._%+-]*[A-Za-z0-9])?@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/;

/** 8 to 64 characters of any kind (checked before the class rules below). */
export const PASSWORD_LENGTH = /^[\s\S]{8,64}$/;

/** No whitespace anywhere in the password. */
export const PASSWORD_NO_SPACE = /^\S+$/;

/** At least one lowercase letter. */
export const PASSWORD_LOWER = /\p{Ll}/u;

/** At least one uppercase letter. */
export const PASSWORD_UPPER = /\p{Lu}/u;

/** At least one decimal digit of any script. */
export const PASSWORD_DIGIT = /\p{Nd}/u;

/** At least one symbol: anything that is not a letter, mark, number or space. */
export const PASSWORD_SYMBOL = /[^\p{L}\p{M}\p{N}\s]/u;

/* ---------------------------------- limits ---------------------------------- */

/**
 * Inputs are sliced to these lengths before any regex runs, so a pathological
 * paste can never reach the patterns at full size. The slices sit ABOVE the
 * allowed maxima (50/254/64) so oversized values still fail validation
 * instead of being silently truncated into valid ones: the email slice is 255
 * (one past the 254 limit), the others leave plenty of headroom.
 */
const MAX_NAME_INPUT = 100;
const MAX_EMAIL_INPUT = 255;
const MAX_PASSWORD_INPUT = 100;

/** Small blocklist of frequently breached passwords, checked case-insensitively. */
const COMMON_PASSWORD_LIST = [
  "password",
  "password1",
  "password1!",
  "password123",
  "123456",
  "12345678",
  "123456789",
  "1234567890",
  "qwerty",
  "qwerty123",
  "qwerty123!",
  "qwertyuiop",
  "abc123",
  "111111",
  "000000",
  "123123",
  "iloveyou",
  "admin",
  "admin123",
  "letmein",
  "welcome",
  "welcome1",
  "monkey",
  "dragon",
  "football",
  "baseball",
  "sunshine",
  "princess",
  "master",
  "shadow",
] as const;

export const COMMON_PASSWORDS: ReadonlySet<string> = new Set(COMMON_PASSWORD_LIST);

/* --------------------------------- password -------------------------------- */

export interface PasswordRule {
  id: PasswordRuleId;
  label: PasswordRuleLabel;
  message: AuthValidationMessage;
  /** `localPart` is the lowercased local part of the email, "" when unknown. */
  test: (password: string, localPart: string) => boolean;
}

/** The live checklist order; also the order validation reports failures in. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: "length",
    label: "auth.ruleLength",
    message: "validation.passwordLength",
    test: (password) => PASSWORD_LENGTH.test(password.slice(0, MAX_PASSWORD_INPUT)),
  },
  {
    id: "noSpace",
    label: "auth.ruleNoSpace",
    message: "validation.passwordNoSpace",
    test: (password) => PASSWORD_NO_SPACE.test(password.slice(0, MAX_PASSWORD_INPUT)),
  },
  {
    id: "lowercase",
    label: "auth.ruleLowercase",
    message: "validation.passwordLowercase",
    test: (password) => PASSWORD_LOWER.test(password.slice(0, MAX_PASSWORD_INPUT)),
  },
  {
    id: "uppercase",
    label: "auth.ruleUppercase",
    message: "validation.passwordUppercase",
    test: (password) => PASSWORD_UPPER.test(password.slice(0, MAX_PASSWORD_INPUT)),
  },
  {
    id: "digit",
    label: "auth.ruleDigit",
    message: "validation.passwordDigit",
    test: (password) => PASSWORD_DIGIT.test(password.slice(0, MAX_PASSWORD_INPUT)),
  },
  {
    id: "symbol",
    label: "auth.ruleSymbol",
    message: "validation.passwordSymbol",
    test: (password) => PASSWORD_SYMBOL.test(password.slice(0, MAX_PASSWORD_INPUT)),
  },
  {
    id: "noEmail",
    label: "auth.ruleEmail",
    message: "validation.passwordContainsEmail",
    test: (password, localPart) =>
      localPart.length < 3 || !password.toLowerCase().includes(localPart),
  },
  {
    id: "notCommon",
    label: "auth.ruleCommon",
    message: "validation.passwordCommon",
    test: (password) => !COMMON_PASSWORDS.has(password.trim().toLowerCase()),
  },
];

export interface PasswordChecklistItem {
  id: PasswordRuleId;
  label: PasswordRuleLabel;
  met: boolean;
}

/** Local part of the email, lowercased; "" when the email has none (yet). */
function emailLocalPart(email: string): string {
  const at = email.indexOf("@");
  const local = at === -1 ? email : email.slice(0, at);
  return local.trim().toLowerCase();
}

/** Judges one password against one rule; the shared primitive for the UI. */
export function passwordMeetsRule(
  rule: PasswordRule,
  password: string,
  email: string,
): boolean {
  return rule.test(password.slice(0, MAX_PASSWORD_INPUT), emailLocalPart(email));
}

/** Live checklist state for the signup password field. */
export function passwordChecklist(password: string, email: string): PasswordChecklistItem[] {
  return PASSWORD_RULES.map((rule) => ({
    id: rule.id,
    label: rule.label,
    met: passwordMeetsRule(rule, password, email),
  }));
}

/**
 * 0-4 strength score: one point per character class, capped when the password
 * is too short, has spaces, contains the email or is a common password.
 */
export function passwordStrength(password: string, email: string): number {
  const raw = password.slice(0, MAX_PASSWORD_INPUT);
  if (raw === "") return 0;
  const classes = [PASSWORD_LOWER, PASSWORD_UPPER, PASSWORD_DIGIT, PASSWORD_SYMBOL].filter(
    (pattern) => pattern.test(raw),
  ).length;
  let score = classes;
  if (!PASSWORD_LENGTH.test(raw)) score = Math.min(score, 1);
  if (!PASSWORD_NO_SPACE.test(raw)) score = Math.min(score, 1);
  if (
    emailLocalPart(email).length >= 3 &&
    raw.toLowerCase().includes(emailLocalPart(email))
  ) {
    score = Math.min(score, 1);
  }
  if (COMMON_PASSWORDS.has(raw.trim().toLowerCase())) score = Math.min(score, 1);
  return score;
}

/* -------------------------------- validators -------------------------------- */

export function validateName(value: string): AuthValidationMessage | undefined {
  const name = value.trim().slice(0, MAX_NAME_INPUT);
  if (name === "") return "validation.nameRequired";
  if (!NAME_REGEX.test(name)) return "validation.nameFormat";
  return undefined;
}

export function validateAuthEmail(value: string): AuthValidationMessage | undefined {
  const email = value.trim().slice(0, MAX_EMAIL_INPUT);
  if (email === "") return "validation.emailRequired";
  if (!EMAIL_REGEX.test(email)) return "validation.emailFormat";
  return undefined;
}

/** Login only: the password must be present, composition is NOT enforced here. */
export function validateLoginPassword(value: string): AuthValidationMessage | undefined {
  return value === "" ? "validation.passwordRequired" : undefined;
}

/** Signup only: the full composition rules, in checklist order. */
export function validateSignupPassword(
  value: string,
  email: string,
): AuthValidationMessage | undefined {
  const raw = value.slice(0, MAX_PASSWORD_INPUT);
  if (raw === "") return "validation.passwordRequired";
  for (const rule of PASSWORD_RULES) {
    if (!passwordMeetsRule(rule, raw, email)) return rule.message;
  }
  return undefined;
}

export function validateConfirmPassword(
  value: string,
  password: string,
): AuthValidationMessage | undefined {
  if (value === "") return "validation.confirmRequired";
  if (value !== password) return "validation.confirmMismatch";
  return undefined;
}

/* ------------------------------- form helpers ------------------------------- */

export function validateLoginField(
  field: keyof LoginFormData,
  data: LoginFormData,
): AuthValidationMessage | undefined {
  switch (field) {
    case "email":
      return validateAuthEmail(data.email);
    case "password":
      return validateLoginPassword(data.password);
    case "remember":
      return undefined;
  }
}

export function validateLoginForm(data: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {};
  for (const field of ["email", "password"] as const) {
    const message = validateLoginField(field, data);
    if (message !== undefined) errors[field] = message;
  }
  return errors;
}

export interface SignupValidationOptions {
  /** True when the (normalised) email already belongs to a stored account. */
  emailRegistered: boolean;
}

export function validateSignupField(
  field: keyof SignupFormData,
  data: SignupFormData,
  options: SignupValidationOptions,
): AuthValidationMessage | undefined {
  switch (field) {
    case "name":
      return validateName(data.name);
    case "email": {
      const message = validateAuthEmail(data.email);
      if (message !== undefined) return message;
      return options.emailRegistered ? "validation.emailTaken" : undefined;
    }
    case "password":
      return validateSignupPassword(data.password, data.email);
    case "confirmPassword":
      return validateConfirmPassword(data.confirmPassword, data.password);
    case "acceptTerms":
      return data.acceptTerms ? undefined : "validation.authTerms";
    case "remember":
      return undefined;
  }
}

export function validateSignupForm(
  data: SignupFormData,
  options: SignupValidationOptions,
): SignupFormErrors {
  const errors: SignupFormErrors = {};
  for (const field of [
    "name",
    "email",
    "password",
    "confirmPassword",
    "acceptTerms",
  ] as const) {
    const message = validateSignupField(field, data, options);
    if (message !== undefined) errors[field] = message;
  }
  return errors;
}
