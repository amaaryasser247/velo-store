/**
 * Pixel audit: renders every route at 1440px and 390px wide, both locales and
 * both themes, in headless Edge and computes the share of pixels whose R, G
 * and B are ALL >= 245 ("near-white"). The palette must never look white, so
 * the budget is 0.5% per shot in every theme; anything above that is a bug.
 * The table also lists the pixels that are exactly #FFFFFF and the bounding
 * box of the near-white pixels, so offending regions can be located.
 *
 *   npx tsx scripts/audit-whites.ts            # table only
 *   set AUDIT_OUT=tmp/audit && npx tsx ...     # also keeps the PNGs
 *
 * Requires the dev server on AUDIT_BASE (default http://localhost:5173).
 */
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import sharp from "sharp";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:5173";
const OUT_DIR = process.env.AUDIT_OUT ?? "";

type Width = { label: string; w: number; h: number };
type Row = {
  route: string;
  width: string;
  locale: string;
  theme: string;
  white: number;
  near: number;
  total: number;
  bbox: string | null;
};

const ROUTES: Array<[string, string]> = [
  ["/", "home"],
  ["/shop", "shop"],
  ["/product/DM3493-002", "pdp"],
  ["/cart", "bag"],
  ["/checkout", "checkout"],
  ["/order-success", "order-success"],
  ["/wishlist", "wishlist"],
  ["/login", "login"],
  ["/signup", "signup"],
  ["/account", "account"],
  ["/does-not-exist", "404"],
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

const WIDTHS: Width[] = [
  { label: "1440", w: 1440, h: 900 },
  { label: "390", w: 390, h: 844 },
];

// A populated bag + a stored demo order, so the bag/checkout/order pages show
// their full states rather than the empty ones.
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
  "velo:last-order": JSON.stringify({
    id: "VL-AUDIT0000001",
    placedAt: "2026-10-18T10:00:00.000Z",
    customer: {
      fullName: "Audit Tester",
      email: "audit@example.com",
      city: "Cairo",
      country: "EG",
      shippingMethod: "standard",
    },
    lines: [
      {
        productId: "DM3493-002",
        title: "Nike SB Chron 2",
        brand: "Nike",
        size: 42,
        quantity: 1,
        unitPrice: 3639,
      },
    ],
    summary: {
      itemCount: 1,
      subtotal: 3639,
      shipping: 600,
      tax: 509.46,
      total: 4748.46,
      freeShippingRemaining: 6361,
    },
  }),
};

type Stats = Pick<Row, "white" | "near" | "total" | "bbox">;

async function analyse(buf: Buffer): Promise<Stats> {
  const { data, info } = await sharp(buf).raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  let white = 0;
  let near = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = -1;
  let maxY = -1;
  const total = info.width * info.height;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * channels;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      if (r === 255 && g === 255 && b === 255) white++;
      if (r >= 245 && g >= 245 && b >= 245) {
        near++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  const bbox = near > 0 ? `x${String(minX)}-${String(maxX)} y${String(minY)}-${String(maxY)}` : null;
  return { white, near, total, bbox };
}

const rows: Row[] = [];

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

    for (const locale of ["en", "ar"]) {
      for (const theme of ["light", "dark"]) {
        await page.goto(BASE + "/", { waitUntil: "load" });
        await page.evaluate(
          ([l, t]) => {
            localStorage.setItem("velo:language", JSON.stringify(l));
            localStorage.setItem("velo:theme", JSON.stringify(t));
            localStorage.setItem("velo:announcement-dismissed", JSON.stringify(true));
          },
          [locale, theme] as const,
        );

        for (const [route, name] of ROUTES) {
          // The account page only renders signed in, while login and signup
          // must stay anonymous: swap the auth keys per route.
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
          const buf = await page.screenshot({ fullPage: true });
          const { white, near, total, bbox } = await analyse(buf);
          rows.push({ route: name, width: width.label, locale, theme, white, near, total, bbox });
          if (OUT_DIR) {
            await mkdir(OUT_DIR, { recursive: true });
            const file = join(OUT_DIR, `${name}-${width.label}-${locale}-${theme}.png`);
            await page.screenshot({ path: file, fullPage: true });
          }
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

const fmt = (n: number, total: number) => `${((n / total) * 100).toFixed(3)}%`;
console.log(
  [
    "route".padEnd(15),
    "w".padEnd(6),
    "lng".padEnd(4),
    "theme".padEnd(6),
    ">=245 px".padStart(9),
    "share".padStart(8),
    "exact-white".padStart(11),
    "region",
  ].join(" "),
);
let worst = 0;
for (const row of rows) {
  const share = row.near / row.total;
  worst = Math.max(worst, share);
  console.log(
    [
      row.route.padEnd(15),
      row.width.padEnd(6),
      row.locale.padEnd(4),
      row.theme.padEnd(6),
      String(row.near).padStart(9),
      fmt(row.near, row.total).padStart(8),
      fmt(row.white, row.total).padStart(11),
      row.bbox ?? "",
    ].join(" "),
  );
}
const overBudget = rows.filter((r) => r.near / r.total > 0.005);
console.log(
  `\n${rows.length} shots - worst "all channels >=245" share ${(worst * 100).toFixed(3)}% - ${overBudget.length} shot(s) above the 0.5% budget`,
);
if (overBudget.length) {
  for (const row of overBudget)
    console.log(
      `  OVER: ${row.route} @${row.width} ${row.locale}/${row.theme} -> ${((row.near / row.total) * 100).toFixed(3)}% ${row.bbox ?? ""}`,
    );
  process.exitCode = 1;
}
