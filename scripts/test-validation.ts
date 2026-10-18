/**
 * Validation tests for the demo auth, run with `npm run test:validation`.
 *
 * Plain node:assert, no test framework: the file doubles as the documented
 * examples for every regex edge case (Arabic and accented names, dot rules in
 * the email local part, password length boundaries, each missing character
 * class, common passwords, the email-local-part rule) plus the returnTo
 * sanitiser and the normalisation helpers.
 */
import assert from "node:assert/strict";
import {
  EMAIL_REGEX,
  PASSWORD_LENGTH,
  validateAuthEmail,
  validateConfirmPassword,
  validateLoginForm,
  validateLoginPassword,
  validateName,
  validateSignupForm,
  validateSignupPassword,
  passwordChecklist,
  passwordStrength,
} from "../src/utils/authValidation.ts";
import {
  firstNameOf,
  initialOf,
  normalizeEmail,
  normalizeName,
  sanitizeReturnTo,
} from "../src/utils/auth.ts";
import { NAME_REGEX } from "../src/utils/authValidation.ts";
import { INITIAL_LOGIN_FORM, INITIAL_SIGNUP_FORM } from "../src/types/auth.ts";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean): void {
  if (condition) {
    passed += 1;
  } else {
    failures.push(name);
  }
}

function eq(name: string, actual: unknown, expected: unknown): void {
  if (actual === expected) {
    passed += 1;
  } else {
    failures.push(`${name} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`);
  }
}

/* ----------------------------------- names ---------------------------------- */

eq("name: plain Latin", validateName("Ahmed Ali"), undefined);
eq("name: Arabic", validateName("أحمد علي"), undefined);
eq("name: accented Latin", validateName("José Álvarez"), undefined);
eq("name: Turkish letters", validateName("Mühendis Ğ"), undefined);
eq("name: apostrophe", validateName("O'Brien"), undefined);
eq("name: curly apostrophe", validateName("O’Brien"), undefined);
eq("name: hyphen", validateName("Jean-Luc"), undefined);
eq("name: trailing dot", validateName("A."), undefined);
eq("name: trims outer spaces", validateName("  Ali  "), undefined);
eq("name: single char", validateName("A"), "validation.nameFormat");
eq("name: digit in name", validateName("Ali1"), "validation.nameFormat");
eq("name: underscore in name", validateName("Ali_"), "validation.nameFormat");
eq("name: leading hyphen", validateName("-Ali"), "validation.nameFormat");
eq("name: inner newline", validateName("أحمد\nعلي"), "validation.nameFormat");
eq("name: empty", validateName(""), "validation.nameRequired");
eq("name: spaces only", validateName("   "), "validation.nameRequired");
eq("name: 50 chars", validateName(`A${"b".repeat(49)}`), undefined);
eq("name: 51 chars", validateName(`A${"b".repeat(50)}`), "validation.nameFormat");
check("NAME_REGEX: 50 chars", NAME_REGEX.test(`A${"b".repeat(49)}`));
check("NAME_REGEX: 51 chars", !NAME_REGEX.test(`A${"b".repeat(50)}`));

/* ---------------------------------- emails ---------------------------------- */

eq("email: plain", validateAuthEmail("user@example.com"), undefined);
eq("email: dotted local + tag + subdomain", validateAuthEmail("first.last+tag@sub.example.co"), undefined);
eq("email: short domain", validateAuthEmail("a@b.co"), undefined);
eq("email: uppercase", validateAuthEmail("USER@EXAMPLE.COM"), undefined);
eq("email: trims outer spaces", validateAuthEmail("  user@example.com  "), undefined);
eq("email: 64-char local part", validateAuthEmail(`${"a".repeat(64)}@x.com`), undefined);
eq("email: 65-char local part", validateAuthEmail(`${"a".repeat(65)}@x.com`), "validation.emailFormat");
eq("email: consecutive dots", validateAuthEmail("a..b@x.com"), "validation.emailFormat");
eq("email: leading dot", validateAuthEmail(".a@x.com"), "validation.emailFormat");
eq("email: trailing dot before @", validateAuthEmail("a.@x.com"), "validation.emailFormat");
eq("email: no TLD", validateAuthEmail("a@x"), "validation.emailFormat");
eq("email: hyphen-leading domain label", validateAuthEmail("a@-x.com"), "validation.emailFormat");
eq("email: hyphen-trailing domain label", validateAuthEmail("a@x-.com"), "validation.emailFormat");
eq("email: double @", validateAuthEmail("user@@example.com"), "validation.emailFormat");
eq("email: one-letter TLD", validateAuthEmail("user@example.c"), "validation.emailFormat");
eq("email: trailing dot after TLD", validateAuthEmail("a@x.com."), "validation.emailFormat");
eq("email: empty", validateAuthEmail(""), "validation.emailRequired");
eq("email: 254 chars total", validateAuthEmail(`${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`), undefined);
eq("email: 255 chars total", validateAuthEmail(`${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.com`), "validation.emailFormat");
check("EMAIL_REGEX: 254-char email passes", EMAIL_REGEX.test(`${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(57)}.com`));
check("EMAIL_REGEX: 255-char email fails", !EMAIL_REGEX.test(`${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(58)}.com`));

/* --------------------------------- passwords -------------------------------- */

check("PASSWORD_LENGTH: 7 chars fail", !PASSWORD_LENGTH.test("Aa1!aaa"));
check("PASSWORD_LENGTH: 8 chars pass", PASSWORD_LENGTH.test("Aa1!aaaa"));
check("PASSWORD_LENGTH: 64 chars pass", PASSWORD_LENGTH.test(`Aa1!${"x".repeat(60)}`));
check("PASSWORD_LENGTH: 65 chars fail", !PASSWORD_LENGTH.test(`Aa1!${"x".repeat(61)}`));

eq("password: empty", validateSignupPassword("", ""), "validation.passwordRequired");
eq("password: 7 chars", validateSignupPassword("Aa1!aaa", ""), "validation.passwordLength");
eq("password: 8 chars", validateSignupPassword("Abcd123!", ""), undefined);
eq("password: 64 chars", validateSignupPassword(`Aa1!${"x".repeat(60)}`, ""), undefined);
eq("password: 65 chars", validateSignupPassword(`Aa1!${"x".repeat(61)}`, ""), "validation.passwordLength");
eq("password: contains a space", validateSignupPassword("Abcd 123!", ""), "validation.passwordNoSpace");
eq("password: no lowercase", validateSignupPassword("ABCD1234!", ""), "validation.passwordLowercase");
eq("password: no uppercase", validateSignupPassword("abcd1234!", ""), "validation.passwordUppercase");
eq("password: no digit", validateSignupPassword("Abcdefg!", ""), "validation.passwordDigit");
eq("password: no symbol", validateSignupPassword("Abcd1234", ""), "validation.passwordSymbol");
eq("password: contains email local part", validateSignupPassword("Alice1234!", "alice@example.com"), "validation.passwordContainsEmail");
eq("password: local part shorter than 3 ignored", validateSignupPassword("Abcd1234!", "ab@example.com"), undefined);
eq("password: common (Password1!)", validateSignupPassword("Password1!", ""), "validation.passwordCommon");
eq("password: common (Qwerty123!)", validateSignupPassword("Qwerty123!", ""), "validation.passwordCommon");
eq("login password: empty is required", validateLoginPassword(""), "validation.passwordRequired");
eq("login password: composition is NOT enforced", validateLoginPassword("weak"), undefined);

/* --------------------------------- checklist -------------------------------- */

eq("checklist: 8 items", passwordChecklist("Abcd1234!", "alice@example.com").filter((item) => item.met).length, 8);
const partial = passwordChecklist("Abcd", "");
eq("checklist: partial met count", partial.filter((item) => item.met).length, 5);
eq("checklist: length unmet for 'Abcd'", partial.find((item) => item.id === "length")?.met, false);
eq("checklist: uppercase met for 'Abcd'", partial.find((item) => item.id === "uppercase")?.met, true);
eq("checklist: noEmail met without email", partial.find((item) => item.id === "noEmail")?.met, true);
eq("checklist: email rule unmet", passwordChecklist("alice1234A!", "alice@example.com").find((item) => item.id === "noEmail")?.met, false);
eq("checklist: common rule unmet", passwordChecklist("Password1!", "").find((item) => item.id === "notCommon")?.met, false);

/* --------------------------------- strength --------------------------------- */

eq("strength: empty is 0", passwordStrength("", ""), 0);
eq("strength: one class is 1", passwordStrength("abcdefgh", ""), 1);
eq("strength: two classes is 2", passwordStrength("abcdefg1", ""), 2);
eq("strength: short and mixed is capped at 1", passwordStrength("aA1!", ""), 1);
eq("strength: four classes is 4", passwordStrength("Abcd1234!", ""), 4);
eq("strength: email containment caps at 1", passwordStrength("Alice1234!", "alice@example.com"), 1);
eq("strength: common password caps at 1", passwordStrength("Password1!", ""), 1);

/* ---------------------------------- confirm --------------------------------- */

eq("confirm: empty", validateConfirmPassword("", "Abcd1234!"), "validation.confirmRequired");
eq("confirm: matches", validateConfirmPassword("Abcd1234!", "Abcd1234!"), undefined);
eq("confirm: mismatch", validateConfirmPassword("Abcd1234?", "Abcd1234!"), "validation.confirmMismatch");

/* -------------------------------- form shapes ------------------------------- */

eq("login form: empty", JSON.stringify(validateLoginForm(INITIAL_LOGIN_FORM)), JSON.stringify({ email: "validation.emailRequired", password: "validation.passwordRequired" }));

const emptySignupErrors = validateSignupForm(INITIAL_SIGNUP_FORM, { emailRegistered: false });
eq("signup form: five errors when empty and unchecked", Object.keys(emptySignupErrors).length, 5);
eq("signup form: name", emptySignupErrors.name, "validation.nameRequired");
eq("signup form: email", emptySignupErrors.email, "validation.emailRequired");
eq("signup form: password", emptySignupErrors.password, "validation.passwordRequired");
eq("signup form: confirm", emptySignupErrors.confirmPassword, "validation.confirmRequired");
eq("signup form: terms", emptySignupErrors.acceptTerms, "validation.authTerms");

eq("signup form: duplicate email", validateSignupForm({ ...INITIAL_SIGNUP_FORM, email: "user@example.com" }, { emailRegistered: true }).email, "validation.emailTaken");

const validSignup = {
  name: "Ahmed Ali",
  email: "ahmed@example.com",
  password: "Abcd1234!",
  confirmPassword: "Abcd1234!",
  acceptTerms: true,
  remember: true,
};
eq("signup form: fully valid", Object.keys(validateSignupForm(validSignup, { emailRegistered: false })).length, 0);

/* -------------------------------- returnTo ---------------------------------- */

eq("returnTo: internal path", sanitizeReturnTo("/account"), "/account");
eq("returnTo: path with query", sanitizeReturnTo("/shop?new=1"), "/shop?new=1");
eq("returnTo: path with hash", sanitizeReturnTo("/account?x=1#frag"), "/account?x=1#frag");
eq("returnTo: protocol-relative", sanitizeReturnTo("//evil.com"), null);
eq("returnTo: triple slash", sanitizeReturnTo("///evil.com"), null);
eq("returnTo: backslash trick", sanitizeReturnTo("/\\evil.com"), null);
eq("returnTo: absolute URL", sanitizeReturnTo("https://evil.com"), null);
eq("returnTo: javascript scheme", sanitizeReturnTo("javascript:alert(1)"), null);
eq("returnTo: scheme in query", sanitizeReturnTo("/ok?next=https://evil.com"), null);
eq("returnTo: empty string", sanitizeReturnTo(""), null);
eq("returnTo: null", sanitizeReturnTo(null), null);
eq("returnTo: inner tab", sanitizeReturnTo("/a\tb"), null);
eq("returnTo: inner newline", sanitizeReturnTo("/a\nb"), null);
eq("returnTo: no leading slash", sanitizeReturnTo("account"), null);
eq("returnTo: relative with scheme prefix", sanitizeReturnTo("https:/evil.com"), null);

/* ------------------------------- normalisation ------------------------------ */

eq("normalizeName: collapses whitespace", normalizeName("  Ahmed   Ali  "), "Ahmed Ali");
eq("normalizeName: NFC composes", normalizeName("Cafe\u0301") === normalizeName("Café"), true);
eq("normalizeEmail: trims and lowercases", normalizeEmail("  User@Example.COM "), "user@example.com");
eq("firstNameOf: first word", firstNameOf("Ahmed Ali"), "Ahmed");
eq("firstNameOf: single word", firstNameOf("علي"), "علي");
eq("initialOf: Latin", initialOf("Ahmed Ali"), "A");
eq("initialOf: Arabic", initialOf("علي"), "ع");

/* ---------------------------------- report ---------------------------------- */

assert.ok(passed > 0, "no assertions ran");

console.log(`test-validation: ${passed} checks passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  x ${failure}`);
  process.exit(1);
}
