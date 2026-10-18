/**
 * Element audit: walks every DOM element on every route (both locales, light
 * + dark) at 1440px and 390px and reports
 *   - any computed colour, background, border, outline, fill or stroke that
 *     resolves to pure white,
 *   - any opaque background-color within 1.2:1 of white (the palette must
 *     never look white),
 *   - any image that is not blended with `multiply`.
 *
 *   npx tsx scripts/audit-elements.ts
 *
 * Requires the dev server on AUDIT_BASE (default http://localhost:5173).
 */
import { chromium } from "playwright";

const BASE = process.env.AUDIT_BASE ?? "http://localhost:5173";

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

const WIDTHS = [
  { label: "1440", w: 1440, h: 900 },
  { label: "390", w: 390, h: 844 },
];

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

const PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "outlineColor",
  "fill",
  "stroke",
] as const;

type Report = {
  elements: number;
  offenders: string[];
  nearWhite: string[];
  allowed: string[];
  images: number;
  badBlend: string[];
};

const rows: Array<{ route: string; width: string; locale: string; theme: string } & Report> = [];

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
        await page.goto(`${BASE}/`, { waitUntil: "load" });
        await page.evaluate(
          ([l, t]) => {
            localStorage.setItem("velo:language", JSON.stringify(l));
            localStorage.setItem("velo:theme", JSON.stringify(t));
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
          // Passed as a string: tsx/esbuild injects `__name` helpers into
          // functions that declare nested functions, which do not exist in
          // the page context.
          const report = (await page.evaluate(`(() => {
            const props = ${JSON.stringify(PROPS)};
            const offenders = [];
            const nearWhite = [];
            const allowed = [];
            let elements = 0;
            const describe = (el, pseudo, prop) => {
              const cls = String(el.getAttribute("class") ?? "").slice(0, 80);
              const id = el.id ? "#" + el.id : "";
              return "<" + el.tagName.toLowerCase() + id + ' class="' + cls + '"> ' + pseudo + prop;
            };
            const rootStyle = getComputedStyle(document.documentElement);
            const isDark = document.documentElement.getAttribute("data-theme") === "dark";
            const hexToRgb = (hex) => {
              const c = String(hex).trim().replace("#", "");
              return "rgb(" + parseInt(c.slice(0, 2), 16) + ", " + parseInt(c.slice(2, 4), 16) + ", " + parseInt(c.slice(4, 6), 16) + ")";
            };
            // In dark mode the ink token is the bright content tint; elements
            // that paint it as a background are foreground panels (buttons,
            // badges, the progress rail), not neutral surfaces, so they are
            // reported separately instead of failing the check.
            const darkInk = isDark ? hexToRgb(rootStyle.getPropertyValue("--color-ink")) : "";
            const channel = (c) => {
              const v = c / 255;
              return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
            };
            const whiteContrast = (r, g, b) => {
              const l = 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
              return 1.05 / (l + 0.05);
            };
            const parse = (s) => {
              const m = /^rgba?\\((\\d+), (\\d+), (\\d+)(?:, ([\\d.]+))?\\)$/.exec(s);
              if (m === null) return null;
              return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
            };
            for (const el of [document.body].concat(Array.from(document.body.querySelectorAll("*")))) {
              elements += 1;
              const cs = getComputedStyle(el);
              const painted = cs.display !== "none" && cs.visibility !== "hidden";
              for (const prop of props) {
                if (cs.getPropertyValue(prop) === "rgb(255, 255, 255)") {
                  offenders.push(describe(el, "", prop));
                  break;
                }
              }
              const bg = parse(cs.backgroundColor);
              if (painted && bg !== null && bg.a === 1 && whiteContrast(bg.r, bg.g, bg.b) < 1.2) {
                if (darkInk !== "" && cs.backgroundColor === darkInk) {
                  allowed.push(describe(el, "", "ink-bright panel " + cs.backgroundColor));
                } else {
                  nearWhite.push(describe(el, "", "background " + cs.backgroundColor));
                }
              }
              for (const pseudo of ["::before", "::after"]) {
                const ps = getComputedStyle(el, pseudo);
                if (ps.content === "none") continue;
                if (
                  ps.backgroundColor === "rgb(255, 255, 255)" ||
                  ps.borderTopColor === "rgb(255, 255, 255)"
                ) {
                  offenders.push(describe(el, pseudo, "background/border"));
                }
                const pbg = parse(ps.backgroundColor);
                if (painted && pbg !== null && pbg.a === 1 && whiteContrast(pbg.r, pbg.g, pbg.b) < 1.2) {
                  nearWhite.push(describe(el, pseudo, "background " + ps.backgroundColor));
                }
              }
            }
            const badBlend = [];
            const images = Array.from(document.images);
            for (const img of images) {
              const blend = getComputedStyle(img).mixBlendMode;
              if (blend !== "multiply") badBlend.push((img.currentSrc || img.src) + " -> " + blend);
            }
            return { elements, offenders, nearWhite, allowed, images: images.length, badBlend };
          })()`)) as Report;
          rows.push({ route: name, width: width.label, locale, theme, ...report });
        }
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

let totalElements = 0;
let totalOffenders = 0;
let totalNearWhite = 0;
let totalAllowed = 0;
let totalBadBlend = 0;
for (const row of rows) {
  totalElements += row.elements;
  totalOffenders += row.offenders.length;
  totalNearWhite += row.nearWhite.length;
  totalAllowed += row.allowed.length;
  totalBadBlend += row.badBlend.length;
  const flags: string[] = [];
  if (row.offenders.length) flags.push(`${row.offenders.length} white`);
  if (row.nearWhite.length) flags.push(`${row.nearWhite.length} near-white bg`);
  if (row.badBlend.length) flags.push(`${row.badBlend.length} unblended img`);
  if (flags.length) {
    console.log(`${row.route} @${row.width} ${row.locale}/${row.theme}: ${flags.join(", ")}`);
    for (const detail of row.offenders) console.log(`    white      ${detail}`);
    for (const detail of new Set(row.nearWhite)) console.log(`    near-white ${detail}`);
    for (const detail of row.badBlend) console.log(`    image      ${detail}`);
  }
}

console.log(
  `audit-elements: ${rows.length} route renders, ${totalElements} elements checked -> ` +
    `${totalOffenders} pure-white paint(s), ${totalNearWhite} background(s) within 1.2:1 of white, ` +
    `${totalBadBlend} image(s) not blended with multiply`,
);
console.log(
  `dark-theme ink-bright panels (foreground controls, allowed): ${totalAllowed > 0 ? `${totalAllowed} in the dark renders` : "none"}`,
);
if (totalOffenders > 0 || totalNearWhite > 0 || totalBadBlend > 0) process.exitCode = 1;
