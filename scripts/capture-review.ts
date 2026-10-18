/**
 * Review screenshots: every key route at 1440px and 390px wide, light + dark,
 * in headless Edge. Used to eyeball palette/layering changes before and after
 * a recolour (e.g. SHOTS_OUT=shots/palette-before).
 *
 *   npx tsx scripts/capture-review.ts                # -> shots/review
 *   set SHOTS_OUT=shots/palette-after && npx tsx ... # custom folder
 *
 * Requires the dev server on SHOTS_BASE (default http://localhost:5173).
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";

const BASE = process.env.SHOTS_BASE ?? "http://localhost:5173";
const OUT_DIR = process.env.SHOTS_OUT ?? "shots/review";

const ROUTES: Array<[string, string]> = [
  ["/", "home"],
  ["/shop", "shop"],
  ["/product/DM3493-002", "pdp"],
  ["/cart", "bag"],
  ["/checkout", "checkout"],
  ["/wishlist", "wishlist"],
  ["/login", "login"],
  ["/signup", "signup"],
  ["/account", "account"],
];

// A signed-in seed so /account shows its real state; applied only on that
// route (the login and signup shots must stay anonymous).
const AUDIT_USER = {
  id: "audit-user",
  name: "Audit Tester",
  email: "audit@example.com",
  createdAt: "2026-10-01T10:00:00.000Z",
  salt: "YXVkaXQtc2FsdC0xMjM0NTY3OA==",
  passwordHash: "YXVkaXQtaGFzaC0xMjM0NTY3OA==",
  iterations: 600_000,
};
const AUDIT_USERS = JSON.stringify({ version: 1, users: [AUDIT_USER] });
const AUDIT_SESSION = JSON.stringify({
  version: 1,
  userId: AUDIT_USER.id,
  expiresAt: 4_102_444_800_000,
});

const WIDTHS = [
  { label: "1440", w: 1440, h: 900 },
  { label: "390", w: 390, h: 844 },
];

// A populated bag + wishlist + stored demo order, so the bag/checkout/order
// pages show their full states rather than the empty ones.
const SEED: Record<string, string> = {
  "velo:announcement-dismissed": JSON.stringify(true),
  "velo:wishlist": JSON.stringify({ version: 1, productIds: ["DM3493-002"] }),
  "velo:cart": JSON.stringify({
    version: 1,
    items: [
      { productId: "DM3493-002", size: 42, quantity: 1 },
      { productId: "HQ1625-201", size: 40, quantity: 2 },
    ],
  }),
};

const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  for (const width of WIDTHS) {
    const context = await browser.newContext({
      viewport: { width: width.w, height: width.h },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
    });
    await context.addInitScript((seed: Record<string, string>) => {
      try {
        for (const [key, value] of Object.entries(seed)) localStorage.setItem(key, value);
      } catch {
        /* about:blank has no storage */
      }
    }, SEED);
    const page = await context.newPage();

    for (const theme of ["light", "dark"]) {
      await page.goto(BASE + "/", { waitUntil: "load" });
      await page.evaluate(
        ([t]) => {
          localStorage.setItem("velo:language", JSON.stringify("en"));
          localStorage.setItem("velo:theme", JSON.stringify(t));
        },
        [theme] as const,
      );

      for (const [route, name] of ROUTES) {
        await page.evaluate(
          ([users, session, signedIn]) => {
            if (signedIn) {
              localStorage.setItem("velo:users", users);
              localStorage.setItem("velo:session", session);
            } else {
              localStorage.removeItem("velo:users");
              localStorage.removeItem("velo:session");
            }
          },
          [AUDIT_USERS, AUDIT_SESSION, name === "account"] as const,
        );
        await page.goto(BASE + route, { waitUntil: "load" });
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(180);
        await mkdir(OUT_DIR, { recursive: true });
        await page.screenshot({
          path: join(OUT_DIR, `${name}-${width.label}-${theme}.png`),
          fullPage: true,
        });
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

console.log(`capture-review: ${ROUTES.length * WIDTHS.length * 2} shots -> ${OUT_DIR}`);
