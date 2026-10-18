/**
 * Browser verification for the demo auth, run with `npm run verify:auth`.
 *
 * Drives a real headless Edge through the full list: signup happy path and
 * every field error, duplicate email, login success and the generic failure,
 * the persisted 5-failure throttle with its doubling lock and live countdown,
 * remember-me on/off (which storage area holds the session), session reload,
 * cross-tab logout, /account redirects with returnTo (including hostile
 * values), corrupted storage, plaintext-password leakage, a keyboard-only run,
 * 390px overflow, the delete-account dialog and a compact regression pass over
 * the storefront.
 *
 * Requires the dev server on AUDIT_BASE (default http://localhost:5173).
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:5173";
const OUT_DIR = process.env.AUTH_SHOTS ?? "";
const WIDTH = { width: 1440, height: 900 } as const;
const MOBILE = { width: 390, height: 844 } as const;

const PASSWORD = "VeloDemo#2026";
const EMAIL = "ahmed@example.com";
const NAME = "Ahmed Ali";

let passed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push(detail === undefined ? name : `${name} -> ${detail}`);
    console.error(`  x   ${name}${detail === undefined ? "" : ` -> ${detail}`}`);
  }
}

async function newContext(
  browser: Browser,
  seed: Record<string, string>,
  viewport: { readonly width: number; readonly height: number } = WIDTH,
): Promise<BrowserContext> {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  if (Object.keys(seed).length > 0) {
    await context.addInitScript((entries: Record<string, string>) => {
      for (const [key, value] of Object.entries(entries)) localStorage.setItem(key, value);
    }, seed);
  }
  return context;
}

/** Seeds storage exactly once (no init script), then reloads with it applied. */
async function seedOnce(page: Page, seed: Record<string, string>): Promise<void> {
  await page.goto(`${BASE}/`, { waitUntil: "load" });
  await page.evaluate(
    `(() => { const entries = ${JSON.stringify(seed)}; for (const key of Object.keys(entries)) localStorage.setItem(key, entries[key]); })()`,
  );
  await page.reload({ waitUntil: "load" });
}

async function shot(page: Page, name: string): Promise<void> {
  if (OUT_DIR === "") return;
  await mkdir(OUT_DIR, { recursive: true });
  await page.screenshot({ path: join(OUT_DIR, `${name}.png`), fullPage: true });
}

async function typeSignup(
  page: Page,
  values: {
    name?: string;
    email?: string;
    password?: string;
    confirm?: string;
    terms?: boolean;
    remember?: boolean;
  },
): Promise<void> {
  if (values.name !== undefined) await page.getByLabel("Full name").fill(values.name);
  if (values.email !== undefined) await page.getByLabel("Email", { exact: true }).fill(values.email);
  if (values.password !== undefined) await page.getByLabel("Password", { exact: true }).fill(values.password);
  if (values.confirm !== undefined) await page.getByLabel("Confirm password").fill(values.confirm);
  if (values.terms !== undefined) {
    await page.getByRole("checkbox", { name: /agree to the terms/i }).setChecked(values.terms);
  }
  if (values.remember !== undefined) {
    await page.getByRole("checkbox", { name: /remember me/i }).setChecked(values.remember);
  }
}

async function typeLogin(
  page: Page,
  values: { email?: string; password?: string; remember?: boolean },
): Promise<void> {
  if (values.email !== undefined) await page.getByLabel("Email", { exact: true }).fill(values.email);
  if (values.password !== undefined) await page.getByLabel("Password", { exact: true }).fill(values.password);
  if (values.remember !== undefined) {
    await page.getByRole("checkbox", { name: /remember me/i }).setChecked(values.remember);
  }
}

async function readStored(page: Page, area: "local" | "session", key: string): Promise<string | null> {
  return page.evaluate(`(() => window.${area}Storage.getItem(${JSON.stringify(key)}))()`);
}

/** Waits for one failed/successful submit to finish: the form clears the password. */
async function waitForPasswordCleared(page: Page): Promise<void> {
  await page.waitForFunction(
    `(() => { const input = document.querySelector("input[name='password']"); return input !== null && input.value === ""; })()`,
    undefined,
    { timeout: 20000 },
  );
}

const browser = await chromium.launch({ channel: "msedge", headless: true });

/** Shared fixture: one account created through the real signup form. */
let usersSeed: Record<string, string> = {};
let authedSeed: Record<string, string> = {};

try {
  /* --------------------------- 1. signup happy path -------------------------- */
  console.log("\n[1] signup happy path, session storage, plaintext scan, login");
  {
    const context = await newContext(browser, {});
    const page = await context.newPage();
    await page.goto(`${BASE}/signup`, { waitUntil: "load" });
    await typeSignup(page, { name: NAME, email: EMAIL, password: PASSWORD, confirm: PASSWORD, terms: true, remember: true });
    await shot(page, "signup-1440-filled");
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/account$/, { timeout: 20000 });
    await page.getByRole("button", { name: "Log out" }).waitFor({ timeout: 10000 });

    check("signup lands on /account", page.url().endsWith("/account"), page.url());
    const greeting = await page.locator("h2").first().innerText();
    check("greeting shows the name", greeting.includes(NAME), greeting);
    check("member-since date is shown", (await page.locator("dl").innerText()).includes("Member since"));

    const localSession = await readStored(page, "local", "velo:session");
    const tabSession = await readStored(page, "session", "velo:session");
    check("remember me: session lives in localStorage", localSession !== null);
    check("remember me: sessionStorage copy is cleared", tabSession === null);

    const leaked = await page.evaluate(`(() => {
      const needle = ${JSON.stringify(PASSWORD)};
      const areas = [window.localStorage, window.sessionStorage];
      for (const area of areas) {
        for (let i = 0; i < area.length; i += 1) {
          const k = area.key(i);
          const v = k === null ? null : area.getItem(k);
          if (v !== null && v.includes(needle)) return String(k);
        }
      }
      return null;
    })()`);
    check("plaintext password appears nowhere in storage", leaked === null, String(leaked));

    const usersRaw = await readStored(page, "local", "velo:users");
    const sessionRaw = await readStored(page, "local", "velo:session");
    check("velo:users is a versioned envelope", usersRaw !== null && usersRaw.includes('"version":1'));
    check(
      "velo:users stores salt + hash, not a password field",
      usersRaw !== null && usersRaw.includes("passwordHash") && !usersRaw.includes('"password":'),
    );
    usersSeed = usersRaw === null ? {} : { "velo:users": usersRaw };
    authedSeed = sessionRaw === null ? usersSeed : { ...usersSeed, "velo:session": sessionRaw };

    await page.reload({ waitUntil: "load" });
    check(
      "reload keeps the session",
      page.url().endsWith("/account") && (await page.locator("body").innerText()).includes("Hello"),
    );

    await page.getByRole("button", { name: "Log out" }).click();
    await page.waitForURL(`${BASE}/`);
    check("logout returns home", page.url() === `${BASE}/`);

    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await typeLogin(page, { email: EMAIL, password: "Wrong-Pass#1" });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("alert").waitFor({ timeout: 20000 });
    const generic = await page.getByRole("alert").innerText();
    check("wrong password: generic message", generic.trim() === "Incorrect email or password.", generic);
    check(
      "password field cleared after a failed attempt",
      (await page.getByLabel("Password", { exact: true }).inputValue()) === "",
    );

    await typeLogin(page, { email: "someone-else@example.com", password: PASSWORD });
    await page.getByRole("button", { name: "Sign in" }).click();
    await waitForPasswordCleared(page);
    const genericUnknown = await page.getByRole("alert").innerText();
    check("unknown email: the SAME generic message", genericUnknown.trim() === "Incorrect email or password.", genericUnknown);

    await typeLogin(page, { email: EMAIL, password: PASSWORD });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/account$/, { timeout: 20000 });
    check("login success reaches /account", page.url().endsWith("/account"));

    await context.close();
  }

  /* ------------------------- 2. per-field signup errors ---------------------- */
  console.log("\n[2] signup validation: fields, checklist, aria wiring, duplicate, terms");
  {
    const context = await newContext(browser, usersSeed);
    const page = await context.newPage();
    await page.goto(`${BASE}/signup`, { waitUntil: "load" });

    await page.getByLabel("Full name").fill("A1");
    await page.getByLabel("Email", { exact: true }).focus();
    check("name error on blur", await page.getByText(/Use letters, spaces and ' - \. only/).isVisible());

    await page.getByLabel("Email", { exact: true }).fill("a..b@x.com");
    await page.getByLabel("Password", { exact: true }).focus();
    check("email error on blur (consecutive dots)", await page.getByText(/Enter an email like name@example\.com\./).isVisible());

    await page.getByLabel("Password", { exact: true }).fill("abc");
    const checklist = page.locator("ul[aria-live='polite']");
    const unmetBefore = await checklist.locator("li").filter({ hasText: /not met/i }).count();
    check("checklist marks unmet rules for a weak password", unmetBefore >= 3, String(unmetBefore));
    check("strength meter appears next to the checklist", await page.getByText(/Strength/).isVisible());
    await page.getByLabel("Password", { exact: true }).fill("Abcd1234!");
    const unmetAfter = await checklist.locator("li").filter({ hasText: /not met/i }).count();
    check("checklist clears as rules are met", unmetAfter === 0, String(unmetAfter));
    const metCount = await checklist.locator("li").count();
    check("checklist lists every rule", metCount === 8, String(metCount));

    await page.getByLabel("Password", { exact: true }).fill("abc");
    await page.getByLabel("Confirm password").focus();
    check("weak password error on blur", await page.getByText(/Use 8 to 64 characters\./).isVisible());

    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByLabel("Confirm password").fill("Different#1");
    await page.getByRole("button", { name: "Create account" }).click();
    const mismatchCount = await page.getByText(/The passwords do not match\./).count();
    const termsCount = await page.getByText(/Accept the terms to create an account\./).count();
    check("mismatch error is shown inline and in the summary", mismatchCount === 2, String(mismatchCount));
    check("terms error is shown inline and in the summary", termsCount === 2, String(termsCount));
    check(
      "focus moves to the error summary",
      await page.evaluate(`document.activeElement !== null && document.activeElement.hasAttribute("data-error-summary")`),
    );
    const summaryItems = page.locator("[data-error-summary] li button");
    check(
      "summary lists the four invalid fields in order",
      (await summaryItems.count()) === 4,
      String(await summaryItems.count()),
    );
    await summaryItems.first().click();
    check(
      "summary item moves focus to its field",
      await page.evaluate(`document.activeElement !== null && document.activeElement.getAttribute("name") === "name"`),
    );
    await shot(page, "signup-errors-1440");

    const aria = (await page.evaluate(`(() => {
      const input = document.querySelector("input[name='confirmPassword']");
      if (input === null) return null;
      const describedBy = input.getAttribute("aria-describedby");
      const ids = describedBy === null ? [] : describedBy.split(" ");
      return {
        invalid: input.getAttribute("aria-invalid"),
        describedByExists: ids.length > 0 && ids.every((id) => document.getElementById(id) !== null),
        labels: input.labels === null ? 0 : input.labels.length,
      };
    })()`)) as { invalid: string | null; describedByExists: boolean; labels: number } | null;
    check("invalid confirmed field is marked aria-invalid", aria !== null && aria.invalid === "true");
    check("aria-describedby targets exist (checklist + error)", aria !== null && aria.describedByExists);
    check("every input has a label", aria !== null && aria.labels > 0);

    await typeSignup(page, { name: NAME, email: EMAIL, password: PASSWORD, confirm: PASSWORD, terms: true });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.getByText(/This email is already registered\. Log in instead\./).first().waitFor({ timeout: 20000 });
    check("duplicate email is rejected in the form", true);
    check(
      "duplicate email: focus returns to the error summary",
      await page.evaluate(`document.activeElement !== null && document.activeElement.hasAttribute("data-error-summary")`),
    );
    await shot(page, "signup-duplicate-1440");

    await context.close();
  }

  /* ---------------------------- 3. login throttle ---------------------------- */
  console.log("\n[3] login throttle: 5 failures, countdown, persistence, doubling");
  {
    const context = await newContext(browser, usersSeed);
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "load" });

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await typeLogin(page, { email: EMAIL, password: `Wrong-Pass#${attempt}` });
      await page.getByRole("button", { name: "Sign in" }).click();
      await waitForPasswordCleared(page);
      await page.getByRole("alert").waitFor({ timeout: 20000 });
    }

    const entry5 = (await page.evaluate(`(() => {
      const raw = window.localStorage.getItem("velo:login-throttle");
      if (raw === null) return null;
      const parsed = JSON.parse(raw);
      const entry = parsed.entries[${JSON.stringify(EMAIL)}];
      return entry === undefined ? null : { failures: entry.failures, duration: entry.lockedUntilMs - entry.updatedAtMs };
    })()`)) as { failures: number; duration: number } | null;
    check(
      "throttle is persisted in velo:login-throttle",
      entry5 !== null,
    );
    check("5th failure locks for 30s", entry5 !== null && entry5.failures === 5 && entry5.duration === 30000, JSON.stringify(entry5));

    await page.reload({ waitUntil: "load" });
    await typeLogin(page, { email: EMAIL, password: PASSWORD });
    await page.getByLabel("Password", { exact: true }).blur();
    const countdown = page.getByText(/Try again in \d+ seconds/);
    await countdown.waitFor({ timeout: 5000 });
    check("countdown shown after reload (lock persisted)", true);
    check("countdown is an aria-live polite region", (await countdown.getAttribute("aria-live")) === "polite");
    check("submit disabled while locked", await page.getByRole("button", { name: "Sign in" }).isDisabled());
    const first = await countdown.innerText();
    await page.waitForTimeout(2200);
    const second = await countdown.innerText();
    const seconds = (text: string): number => Number(/\d+/.exec(text)?.[0] ?? "0");
    check("countdown ticks down", seconds(second) < seconds(first), `${first} -> ${second}`);

    // Expire the lock by hand: the 6th failure doubles to 60s.
    await page.evaluate(`(() => {
      const parsed = JSON.parse(window.localStorage.getItem("velo:login-throttle"));
      const entry = parsed.entries[${JSON.stringify(EMAIL)}];
      const now = Date.now();
      entry.lockedUntilMs = now - 1000;
      entry.updatedAtMs = now - 31000;
      window.localStorage.setItem("velo:login-throttle", JSON.stringify(parsed));
    })()`);
    await page.reload({ waitUntil: "load" });
    await typeLogin(page, { email: EMAIL, password: "Wrong-Pass#6" });
    await page.getByRole("button", { name: "Sign in" }).click();
    await waitForPasswordCleared(page);
    const entry6 = (await page.evaluate(`(() => {
      const parsed = JSON.parse(window.localStorage.getItem("velo:login-throttle"));
      const entry = parsed.entries[${JSON.stringify(EMAIL)}];
      return { failures: entry.failures, duration: entry.lockedUntilMs - entry.updatedAtMs };
    })()`)) as { failures: number; duration: number };
    check("6th failure doubles the lock to 60s", entry6.failures === 6 && entry6.duration === 60000, JSON.stringify(entry6));

    // A successful login clears the throttle.
    await page.evaluate(`(() => {
      const parsed = JSON.parse(window.localStorage.getItem("velo:login-throttle"));
      parsed.entries[${JSON.stringify(EMAIL)}].lockedUntilMs = Date.now() - 1000;
      window.localStorage.setItem("velo:login-throttle", JSON.stringify(parsed));
    })()`);
    await page.reload({ waitUntil: "load" });
    await typeLogin(page, { email: EMAIL, password: PASSWORD });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/account$/, { timeout: 20000 });
    const cleared = (await page.evaluate(`(() => {
      const raw = window.localStorage.getItem("velo:login-throttle");
      if (raw === null) return "missing";
      const parsed = JSON.parse(raw);
      return parsed.entries[${JSON.stringify(EMAIL)}] === undefined ? "cleared" : "present";
    })()`)) as string;
    check("successful login clears the throttle entry", cleared === "cleared", cleared);

    await context.close();
  }

  /* --------------------------- 4. remember-me + tabs -------------------------- */
  console.log("\n[4] remember me off -> sessionStorage; per-tab sessions; cross-tab logout");
  {
    const context = await newContext(browser, usersSeed);
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await typeLogin(page, { email: EMAIL, password: PASSWORD, remember: false });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/account$/, { timeout: 20000 });

    check("remember off: nothing in localStorage", (await readStored(page, "local", "velo:session")) === null);
    check("remember off: session in sessionStorage", (await readStored(page, "session", "velo:session")) !== null);
    await page.reload({ waitUntil: "load" });
    check("remember off: reload keeps the tab session", page.url().endsWith("/account"));

    const second = await context.newPage();
    await second.goto(`${BASE}/account`, { waitUntil: "load" });
    await second.waitForURL(/\/login\?returnTo=/, { timeout: 10000 });
    check("a new tab (its own sessionStorage) is anonymous", second.url().includes("/login?returnTo="));

    const rememberContext = await newContext(browser, authedSeed);
    const tabA = await rememberContext.newPage();
    const tabB = await rememberContext.newPage();
    await tabA.goto(`${BASE}/account`, { waitUntil: "load" });
    await tabB.goto(`${BASE}/account`, { waitUntil: "load" });
    check("both tabs start signed in", (await tabA.locator("body").innerText()).includes("Hello"));

    await tabA.getByRole("button", { name: "Log out" }).click();
    await tabA.waitForURL(`${BASE}/`);
    await tabB.waitForURL(/\/login\?returnTo=/, { timeout: 10000 });
    check("logout in one tab signs the other out (storage event)", tabB.url().includes("/login?returnTo="));
    check("logout cleared the session key", (await readStored(tabB, "local", "velo:session")) === null);
    await rememberContext.close();

    // Expiry: an expired session must be dropped on tab focus...
    const expiryContext = await newContext(browser, authedSeed);
    const expiryPage = await expiryContext.newPage();
    await expiryPage.goto(`${BASE}/account`, { waitUntil: "load" });
    await expiryPage.getByRole("button", { name: "Log out" }).waitFor({ timeout: 10000 });
    await expiryPage.evaluate(`(() => {
      const raw = JSON.parse(window.localStorage.getItem("velo:session"));
      raw.expiresAt = Date.now() - 1000;
      window.localStorage.setItem("velo:session", JSON.stringify(raw));
      window.dispatchEvent(new Event("focus"));
    })()`);
    await expiryPage.waitForURL(/\/login\?returnTo=/, { timeout: 10000 });
    check("an expired session is dropped when the tab regains focus", true);
    await expiryContext.close();

    // ...and on load. Seeded once: an init script would re-write the session.
    const loadContext = await browser.newContext({ viewport: WIDTH });
    const loadPage = await loadContext.newPage();
    await seedOnce(loadPage, authedSeed);
    await loadPage.goto(`${BASE}/account`, { waitUntil: "load" });
    await loadPage.getByRole("button", { name: "Log out" }).waitFor({ timeout: 10000 });
    check("a fresh session signs in again", loadPage.url().endsWith("/account"));
    await loadPage.evaluate(`(() => {
      const raw = JSON.parse(window.localStorage.getItem("velo:session"));
      raw.expiresAt = Date.now() - 1000;
      window.localStorage.setItem("velo:session", JSON.stringify(raw));
    })()`);
    await loadPage.reload({ waitUntil: "load" });
    await loadPage.waitForURL(/\/login\?returnTo=/, { timeout: 10000 });
    check("an expired session is dropped on load", true);
    await loadContext.close();

    await context.close();
  }

  /* ----------------------------- 5. returnTo safety --------------------------- */
  console.log("\n[5] returnTo: safe paths work, hostile values are rejected");
  {
    const safeCases: Array<[string, string]> = [
      ["/account", "/account"],
      ["/shop?q=dunk", "/shop?q=dunk"],
    ];
    for (const [value, expected] of safeCases) {
      const context = await newContext(browser, usersSeed);
      const page = await context.newPage();
      await page.goto(`${BASE}/login?returnTo=${encodeURIComponent(value)}`, { waitUntil: "load" });
      await typeLogin(page, { email: EMAIL, password: PASSWORD });
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL((url) => !url.pathname.endsWith("/login"), { timeout: 20000 });
      await page.waitForTimeout(150);
      check(`returnTo ${value}: lands on ${expected}`, page.url().endsWith(expected), page.url());
      await context.close();
    }

    const hostile = ["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)"];
    for (const value of hostile) {
      const context = await newContext(browser, usersSeed);
      const page = await context.newPage();
      await page.goto(`${BASE}/login?returnTo=${encodeURIComponent(value)}`, { waitUntil: "load" });
      await typeLogin(page, { email: EMAIL, password: PASSWORD });
      await page.getByRole("button", { name: "Sign in" }).click();
      await page.waitForURL(/\/account$/, { timeout: 20000 });
      check(`hostile returnTo ${value}: forced to /account`, page.url().endsWith("/account"), page.url());
      await context.close();
    }

    const context = await newContext(browser, usersSeed);
    const page = await context.newPage();
    await page.goto(`${BASE}/account`, { waitUntil: "load" });
    await page.waitForURL(/\/login\?returnTo=/, { timeout: 10000 });
    check("anonymous /account redirects with returnTo=%2Faccount", page.url().includes("returnTo=%2Faccount"), page.url());
    await context.close();
  }

  /* ---------------------------- 6. corrupted storage -------------------------- */
  console.log("\n[6] corrupted velo:users / velo:session / velo:login-throttle");
  {
    const context = await newContext(browser, {
      "velo:users": "not-json{{{",
      "velo:session": JSON.stringify({ version: 1, userId: 123 }),
      "velo:login-throttle": JSON.stringify({ version: 99, entries: "nope" }),
      "velo:announcement-dismissed": JSON.stringify(true),
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(String(error)));

    await page.goto(`${BASE}/`, { waitUntil: "load" });
    check("home renders with corrupted auth storage", (await page.locator("h1").count()) > 0);
    check("no page errors", errors.length === 0, errors.join(" | "));

    await page.goto(`${BASE}/account`, { waitUntil: "load" });
    await page.waitForURL(/\/login\?returnTo=/, { timeout: 10000 });
    check("anonymous with corrupt session -> login", true);
    check("corrupt session envelope was cleaned up", (await readStored(page, "local", "velo:session")) === null);

    await page.goto(`${BASE}/signup`, { waitUntil: "load" });
    await typeSignup(page, { name: NAME, email: EMAIL, password: PASSWORD, confirm: PASSWORD, terms: true });
    await page.getByRole("button", { name: "Create account" }).click();
    await page.waitForURL(/\/account$/, { timeout: 20000 });
    const usersRaw = await readStored(page, "local", "velo:users");
    check("signup rewrites velo:users as a valid envelope", usersRaw !== null && usersRaw.includes('"version":1'));

    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await typeLogin(page, { email: "other@example.com", password: "Wrong#1234" });
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.getByRole("alert").waitFor({ timeout: 20000 });
    const throttleRaw = await readStored(page, "local", "velo:login-throttle");
    check("throttle rewritten after corruption", throttleRaw !== null && throttleRaw.includes('"version":1'));
    check("no page errors after the flows", errors.length === 0, errors.join(" | "));

    await context.close();
  }

  /* ------------------------------ 7. keyboard-only ---------------------------- */
  console.log("\n[7] keyboard-only login and signup");
  {
    const context = await newContext(browser, usersSeed);
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: "load" });

    const active = (): Promise<Record<string, string | null> | null> =>
      page.evaluate(`document.activeElement ? { name: document.activeElement.getAttribute("name"), label: document.activeElement.getAttribute("aria-label"), tag: document.activeElement.tagName } : null`);

    await page.getByRole("button", { name: "Sign in" }).focus();
    await page.keyboard.press("Enter");
    check(
      "empty login submit focuses the error summary",
      await page.evaluate(`document.activeElement !== null && document.activeElement.hasAttribute("data-error-summary")`),
    );
    check(
      "email field is marked invalid",
      await page.evaluate(`document.querySelector("input[name='email']") !== null && document.querySelector("input[name='email']").getAttribute("aria-invalid") === "true"`),
    );

    await page.keyboard.press("Tab");
    check("Tab: summary -> first error item", (await active())?.tag === "BUTTON");
    await page.keyboard.press("Enter");
    check("activating the item focuses the email field", (await active())?.name === "email");
    await page.keyboard.press("Tab");
    check("Tab: email -> password", (await active())?.name === "password");
    await page.keyboard.press("Tab");
    check("Tab: password -> show/hide button", (await active())?.label === "Show password");
    await page.keyboard.press("Tab");
    check("Tab: show/hide -> remember", (await active())?.name === "remember");
    const rememberBefore = await page.getByRole("checkbox", { name: /remember me/i }).isChecked();
    await page.keyboard.press("Space");
    check("Space toggles the remember box", (await page.getByRole("checkbox", { name: /remember me/i }).isChecked()) !== rememberBefore);

    // Back to the email field, all with the keyboard.
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Shift+Tab");
    check("Shift+Tab returns to the email field", (await active())?.name === "email");

    await page.keyboard.type(EMAIL);
    await page.keyboard.press("Tab");
    await page.keyboard.type(PASSWORD);
    await page.keyboard.press("Tab"); // show/hide
    await page.keyboard.press("Tab"); // remember
    await page.keyboard.press("Tab"); // submit
    await page.keyboard.press("Enter");
    await page.waitForURL(/\/account$/, { timeout: 20000 });
    check("keyboard-only login succeeds", page.url().endsWith("/account"));

    const signupContext = await newContext(browser, {});
    const signup = await signupContext.newPage();
    await signup.goto(`${BASE}/signup`, { waitUntil: "load" });
    const signupActive = (): Promise<Record<string, string | null> | null> =>
      signup.evaluate(`document.activeElement ? { name: document.activeElement.getAttribute("name"), label: document.activeElement.getAttribute("aria-label"), tag: document.activeElement.tagName } : null`);

    await signup.getByRole("button", { name: "Create account" }).focus();
    await signup.keyboard.press("Enter");
    check(
      "empty signup submit focuses the error summary",
      await signup.evaluate(`document.activeElement !== null && document.activeElement.hasAttribute("data-error-summary")`),
    );

    await signup.keyboard.press("Tab");
    await signup.keyboard.press("Enter");
    check("summary item focuses the name field", (await signupActive())?.name === "name");

    await signup.keyboard.type("Layla Hassan");
    await signup.keyboard.press("Tab");
    check("Tab: name -> email", (await signupActive())?.name === "email");
    await signup.keyboard.type("layla@example.com");
    await signup.keyboard.press("Tab");
    check("Tab: email -> password", (await signupActive())?.name === "password");
    await signup.keyboard.type(PASSWORD);
    await signup.keyboard.press("Tab");
    check("Tab: password -> its show/hide button", (await signupActive())?.label === "Show password");
    await signup.keyboard.press("Tab");
    check("Tab: show/hide -> confirm", (await signupActive())?.name === "confirmPassword");
    await signup.keyboard.type(PASSWORD);
    await signup.keyboard.press("Tab");
    await signup.keyboard.press("Tab");
    check("Tab past the second show/hide -> terms", (await signupActive())?.name === "acceptTerms");
    await signup.keyboard.press("Space");
    check("Space toggles the terms box", await signup.getByRole("checkbox", { name: /agree to the terms/i }).isChecked());
    await signup.keyboard.press("Tab"); // remember
    await signup.keyboard.press("Tab"); // submit
    await signup.keyboard.press("Enter");
    await signup.waitForURL(/\/account$/, { timeout: 20000 });
    check("keyboard-only signup succeeds", signup.url().endsWith("/account"));

    await context.close();
    await signupContext.close();
  }

  /* ------------------------- 8. narrow viewport + dialog ---------------------- */
  console.log("\n[8] 390px layout, mobile menu entry, dialog, delete account, screenshots");
  {
    const small = await newContext(browser, usersSeed, MOBILE);
    const smallPage = await small.newPage();
    for (const path of ["/login", "/signup"]) {
      await smallPage.goto(`${BASE}${path}`, { waitUntil: "load" });
      const overflow = (await smallPage.evaluate(
        `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
      )) as number;
      check(`${path} has no horizontal overflow at 390px`, overflow <= 0, `${overflow}px`);
      await shot(smallPage, `${path.slice(1)}-390`);
    }
    await smallPage.goto(`${BASE}/signup`, { waitUntil: "load" });
    await typeSignup(smallPage, { name: "A1", email: "a..b@x.com", password: "abc", confirm: "def", terms: false });
    await smallPage.getByRole("button", { name: "Create account" }).click();
    await smallPage.waitForTimeout(300);
    const overflowErrors = (await smallPage.evaluate(
      `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
    )) as number;
    check("signup with errors has no overflow at 390px", overflowErrors <= 0, `${overflowErrors}px`);
    await shot(smallPage, "signup-errors-390");
    await small.close();

    const authedSmall = await newContext(browser, authedSeed, MOBILE);
    const accountSmall = await authedSmall.newPage();
    await accountSmall.goto(`${BASE}/account`, { waitUntil: "load" });
    const overflowAccount = (await accountSmall.evaluate(
      `document.documentElement.scrollWidth - document.documentElement.clientWidth`,
    )) as number;
    check("/account has no horizontal overflow at 390px", overflowAccount <= 0, `${overflowAccount}px`);
    await shot(accountSmall, "account-390");

    await accountSmall.getByRole("button", { name: "Open menu" }).click();
    const menuAccount = accountSmall.locator("[data-menu-link][aria-label^='Account,']");
    await menuAccount.waitFor({ timeout: 5000 });
    check("mobile menu carries the account entry", await menuAccount.isVisible());
    await accountSmall.keyboard.press("Escape");
    await accountSmall.waitForTimeout(400);
    await authedSmall.close();

    // Desktop account + delete confirmation dialog (focus trap, Escape).
    const authed = await newContext(browser, authedSeed);
    const account = await authed.newPage();
    await account.goto(`${BASE}/account`, { waitUntil: "load" });
    await shot(account, "account-1440");
    check(
      "desktop header shows the account initial",
      (await account.locator("[data-account-link]").innerText()).trim() === "A",
    );

    await account.getByRole("button", { name: "Delete account" }).click();
    check("dialog opens", await account.locator("dialog[open]").isVisible());
    const dialogFocus = await account.evaluate(`document.activeElement === null ? "" : document.activeElement.textContent`);
    check("dialog focuses the cancel button first", String(dialogFocus).trim() === "Cancel", String(dialogFocus));
    await shot(account, "delete-dialog-1440");
    await account.keyboard.press("Tab");
    const dialogActive = (): Promise<string> =>
      account.evaluate(`document.activeElement === null ? "" : document.activeElement.textContent || ""`);
    check("Tab moves to the confirm button", (await dialogActive()).trim() === "Yes, delete it");
    await account.keyboard.press("Tab");
    check("Tab wraps back to the first control (trapped)", (await dialogActive()).trim() === "Cancel");
    await account.keyboard.press("Shift+Tab");
    check("Shift+Tab wraps to the last control", (await dialogActive()).trim() === "Yes, delete it");
    await account.keyboard.press("Escape");
    await account.waitForTimeout(150);
    check("Escape closes the dialog", (await account.locator("dialog[open]").count()) === 0);
    const focusBack = await account.evaluate(`document.activeElement === null ? "" : document.activeElement.textContent`);
    check("focus returns to the delete button", String(focusBack).trim() === "Delete account", String(focusBack));
    await authed.close();

    // Deleting removes the account + session, keeps the bag and wishlist.
    const deleteContext = await browser.newContext({ viewport: WIDTH });
    const deletePage = await deleteContext.newPage();
    await seedOnce(deletePage, authedSeed);
    await deletePage.goto(`${BASE}/account`, { waitUntil: "load" });
    check("seeded session restores on /account", (await deletePage.locator("body").innerText()).includes("Hello"));
    await deletePage.evaluate(`(() => {
      localStorage.setItem("velo:cart", JSON.stringify({ version: 1, items: [{ productId: "DM3493-002", size: 42.5, quantity: 1 }] }));
      localStorage.setItem("velo:wishlist", JSON.stringify({ version: 1, productIds: ["DM3493-002"] }));
    })()`);
    await deletePage.getByRole("button", { name: "Delete account" }).click();
    await deletePage.getByRole("button", { name: "Yes, delete it" }).click();
    await deletePage.waitForURL(/\/login$/, { timeout: 10000 });
    await deletePage.getByText(/Your account has been deleted\./).waitFor({ timeout: 10000 });
    check("delete lands on /login with the notice", true);
    const kept = (await deletePage.evaluate(`(() => ({
      users: localStorage.getItem("velo:users"),
      session: localStorage.getItem("velo:session"),
      cart: localStorage.getItem("velo:cart"),
      wishlist: localStorage.getItem("velo:wishlist"),
    }))()`)) as { users: string | null; session: string | null; cart: string | null; wishlist: string | null };
    check("delete removed the user", kept.users !== null && !kept.users.includes(EMAIL));
    check("delete removed the session", kept.session === null);
    check("delete kept the bag", kept.cart !== null && kept.cart.includes("DM3493-002"));
    check("delete kept the wishlist", kept.wishlist !== null && kept.wishlist.includes("DM3493-002"));

    await deletePage.goto(`${BASE}/signup`, { waitUntil: "load" });
    await typeSignup(deletePage, { name: NAME, email: EMAIL, password: PASSWORD, confirm: PASSWORD, terms: true });
    await deletePage.getByRole("button", { name: "Create account" }).click();
    await deletePage.waitForURL(/\/account$/, { timeout: 20000 });
    check("deleted email can sign up again", deletePage.url().endsWith("/account"));
    await deleteContext.close();
  }

  /* --------------------------- 9. storefront regression ----------------------- */
  console.log("\n[9] storefront regression: search, filters, sort, PDP, bag, wishlist, checkout, 404");
  {
    const context = await newContext(browser, {
      "velo:announcement-dismissed": JSON.stringify(true),
      "velo:language": JSON.stringify("en"),
    });
    const page = await context.newPage();

    await page.goto(`${BASE}/`, { waitUntil: "load" });
    check("home renders", (await page.locator("h1").count()) > 0);

    await page.goto(`${BASE}/shop`, { waitUntil: "load" });
    await page.getByRole("searchbox").fill("dunk");
    await page.getByText(/^1 sneaker$/).waitFor({ timeout: 5000 }).catch(() => undefined);
    check("search 'dunk' narrows the grid to 1", await page.getByText(/^1 sneaker$/).isVisible());

    await page.goto(`${BASE}/shop`, { waitUntil: "load" });
    await page.getByRole("checkbox", { name: /Nike/ }).first().click();
    await page.waitForFunction(
      `window.location.search.includes("brand=Nike") && document.querySelectorAll("input[value='Nike'][type='checkbox']:checked").length > 0`,
      undefined,
      { timeout: 5000 },
    );
    check("brand filter checks the box and writes the URL", true);
    check("brand filter writes the URL", page.url().includes("brand=Nike"), page.url());
    check("brand filter leaves a result count", await page.getByText(/sneakers?$/).first().isVisible());

    await page.getByLabel("Sort products").selectOption("price-asc");
    check("sort writes the URL", page.url().includes("sort=price-asc"), page.url());

    await page.goto(`${BASE}/product/DM3493-002`, { waitUntil: "load" });
    const sizeValue = await page.locator("input[type=radio][name$='-size']:not([disabled])").first().getAttribute("value");
    check("PDP has an available size", sizeValue !== null, String(sizeValue));
    if (sizeValue !== null) {
      await page.getByRole("radio", { name: `EU size ${sizeValue}`, exact: true }).check({ force: true });
      await page.getByRole("button", { name: "Add to bag" }).click();
      await page.waitForTimeout(250);
      check("add to bag updates the header badge", (await page.getByLabel(/Bag, 1 item/).count()) > 0);

      await page.getByRole("button", { name: /Add to wishlist/ }).first().click();
      await page.goto(`${BASE}/wishlist`, { waitUntil: "load" });
      check("wishlist keeps the saved pair", (await page.locator("body").innerText()).includes("1 saved pair"));

      await page.goto(`${BASE}/cart`, { waitUntil: "load" });
      await page.getByRole("button", { name: "Increase quantity" }).first().click();
      await page.reload({ waitUntil: "load" });
      check("bag quantity persists across reload", (await page.locator("output").first().innerText()).trim() === "2");

      await page.goto(`${BASE}/checkout`, { waitUntil: "load" });
      check("guest checkout is allowed", (await page.getByRole("button", { name: "Place order" }).count()) === 1);
      check("guest checkout has empty contact fields", (await page.getByLabel("Full name").inputValue()) === "");

      await page.getByRole("button", { name: "Place order" }).click();
      check(
        "checkout submit focuses the error summary",
        await page.evaluate(`document.activeElement !== null && document.activeElement.hasAttribute("data-error-summary")`),
      );
      const checkoutErrors = page.locator("[data-error-summary] li button");
      check(
        "checkout summary lists every invalid field",
        (await checkoutErrors.count()) === 7,
        String(await checkoutErrors.count()),
      );
      await checkoutErrors.first().click();
      check(
        "checkout summary item focuses its field",
        await page.evaluate(`document.activeElement !== null && document.activeElement.getAttribute("name") === "fullName"`),
      );
    }

    await page.goto(`${BASE}/does-not-exist`, { waitUntil: "load" });
    check("404 page renders", (await page.locator("body").innerText()).includes("Page not found"));

    const authedContext = await newContext(browser, {
      ...authedSeed,
      "velo:announcement-dismissed": JSON.stringify(true),
      "velo:language": JSON.stringify("en"),
    });
    const authedPage = await authedContext.newPage();
    await authedPage.goto(`${BASE}/product/DM3493-002`, { waitUntil: "load" });
    const authedSize = await authedPage.locator("input[type=radio][name$='-size']:not([disabled])").first().getAttribute("value");
    if (authedSize !== null) {
      await authedPage.getByRole("radio", { name: `EU size ${authedSize}`, exact: true }).check({ force: true });
      await authedPage.getByRole("button", { name: "Add to bag" }).click();
      await authedPage.waitForTimeout(250);
      await authedPage.goto(`${BASE}/checkout`, { waitUntil: "load" });
      const prefilledName = await authedPage.getByLabel("Full name").inputValue();
      const prefilledEmail = await authedPage.getByLabel("Email", { exact: true }).inputValue();
      check("signed-in checkout prefills the name", prefilledName === NAME, prefilledName);
      check("signed-in checkout prefills the email", prefilledEmail === EMAIL, prefilledEmail);
      await authedPage.getByLabel("Full name").fill("Edited Name");
      check("prefilled fields stay editable", (await authedPage.getByLabel("Full name").inputValue()) === "Edited Name");
    }

    await context.close();
    await authedContext.close();
  }
} finally {
  await browser.close();
}

console.log(`\nverify-auth: ${passed} checks passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const failure of failures) console.error(`  x ${failure}`);
  process.exit(1);
}
