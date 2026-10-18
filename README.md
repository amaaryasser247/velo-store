# VELO

A sneaker storefront built as a frontend-only demo with **React 19, Vite, TypeScript (strict) and Tailwind CSS**. The catalog is a real, build-time snapshot of public Nike listings (adidas is documented-not-collected, see "Data sources"). No backend, no database, no payments.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run catalog:fetch` | Re-collect the product catalog from the source stores (see "Data sources") |
| `npm run typecheck` | Strict TypeScript check (`tsc -b`) |
| `npm run lint` | oxlint |
| `npm run build` | Typecheck, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run i18n:check` | Verify the `en` and `ar` translation key sets match, with no empty values |
| `npm run test:validation` | Field-validation regex tests for auth and checkout (no browser needed) |
| `npm run verify:auth` | Browser run of every auth flow (needs `npm run dev` running) |
| `npm run contrast:check` | Check every colour pairing in the design tokens against WCAG AA, plus the palette acceptance numbers (how far paper, surface and chalk sit from white) |
| `npm run check:backdrops` | Photo-backdrop check: every product photo edge composites to white/transparent, so no rectangle shows on the multiply-blended frames |
| `npm run audit:whites` | Pixel audit: the share of pixels with R, G and B all >= 245 must stay under 0.5% on every route, in both languages and both themes (needs the dev server) |
| `npm run audit:elements` | Element audit: no pure-white paint, no background within 1.2:1 of white and no unblended images on any route (needs the dev server) |
| `npm run shots:review` | Review screenshots of every key route at 1440px and 390px, light + dark (needs the dev server; output dir via `SHOTS_OUT`) |

## Features

- Home with a framed real-product hero, an about section, catalog-driven category tiles, new arrivals and top rated sections, and a brand story
- Shop with text search, category, brand, size, max price and new-only filters, five sort orders, and filter state stored in the URL (shareable links, working back button)
- Product pages with gallery, size picker that disables sizes the source did not stock, quantity cap, sold-out state, related products
- Bag where the same shoe in two sizes is two lines, quantity limits, free-shipping progress and an order summary
- Wishlist, persisted
- Demo checkout with typed form state, per-field validation, focus moved to the first error, shipping method and an order confirmation page
- Demo accounts: sign up, log in and an account page, all stored in the browser (PBKDF2-hashed password, per-email login throttle with a live countdown, remember-me or tab-only sessions, logout that reaches other tabs) — see "Demo accounts" for the honest limits
- Guest checkout stays first-class: signing in only prefills the name and email, and both stay editable
- Persistence for bag, wishlist and the last order, validated on every load
- Dark theme toggle in the header: animated circular reveal (View Transitions API with a colour cross-fade fallback), persisted and applied before first paint, instant for reduced-motion visitors
- Prices in EGP everywhere; the store keeps one size system (EU) across the whole catalog

## Demo accounts (frontend-only)

Accounts and sessions are browser-local, built to demonstrate the flows and the
validation, not to secure anything:

- "Accounts" live in `localStorage` under `velo:users`; the active session is
  `velo:session` — `localStorage` when "remember me" is checked (30 days), a
  `sessionStorage` tab-only session (12 hours) when it is not. Stored values are
  versioned envelopes, read back as `unknown` and validated before use; corrupt
  or outdated records are ignored and cleaned up instead of crashing.
- Passwords are never stored: each account keeps a random 16-byte salt and a
  PBKDF2-HMAC-SHA-256 hash (600,000 iterations) computed with the Web Crypto
  API. If the browser has no `crypto.subtle`, the forms explain instead of
  failing silently.
- Login failures share one generic message ("Incorrect email or password") and
  unknown emails still cost a throwaway derivation so timing does not give the
  answer away. After 5 failures an email is locked for 30 seconds, doubling on
  every further failure (capped at 15 minutes), and the lock is persisted with a
  live countdown while the submit stays disabled.
- Logging out in one tab signs the others out too (via the `storage` event).
  Deleting an account removes the user and the session only: the bag and
  wishlist are device-level and stay where they were.
- **This is not real security.** Everything runs in the browser: anyone with
  devtools can read or change `velo:users` and `velo:session`, and a stored
  hash can be attacked offline. There is no server, no email verification and no
  password reset. Real authentication needs a backend; all storage and hashing
  sit behind `src/api/auth.ts` so that backend can be swapped in later without
  touching the UI.

## TypeScript approach

This is a typed design, not renamed files. Key decisions:

- **Strict settings**: `strict`, `noUncheckedIndexedAccess`, `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. No `any`, no `@ts-ignore`, no non-null assertions.
- **Literal unions over strings**: categories, sort options, shipping methods and country codes are derived from `as const` arrays, so the type and the runtime list cannot drift apart.
- **Discriminated-union reducers**: `CartAction` and `WishlistAction` are handled with an `assertNever` default, so adding an action without handling it is a compile error.
- **Contexts fail loudly**: `useCart`, `useWishlist` and `useAuth` throw a clear error outside their providers. There are no fake defaults and no `!`.
- **Types are not validation**: everything from `fetch` and `localStorage` is `unknown` until `src/utils/parsers.ts` validates it. Stored carts are rebuilt against the catalog, so unknown products, unavailable sizes, sold-out items, bad quantities and outdated versions are dropped or clamped rather than trusted.
- **Stable cart identity**: a line id is `productId::size`.

## Structure

```
src/
  api/          products.ts, auth.ts        network access + local fallback; the browser-only account store
  components/   layout, home, products, cart, checkout, common
  context/      CartContext, WishlistContext, AuthContext, reducers, context objects
  data/         products.ts, sizes.ts   (products.ts + sizes.ts are GENERATED)
  hooks/        useCart, useWishlist, useAuth, useProducts, useLocalStorage, useDocumentTitle
  pages/        Home, Shop, ProductDetails, Wishlist, Cart, Checkout, OrderSuccess, Login, Signup, Account, NotFound
  types/        product, cart, wishlist, checkout, auth, api
  utils/        cart, currency, filters, guards, parsers, storage, validation, auth, authValidation
scripts/        fetch-catalog.ts (the collector) plus the check and verification scripts
```

Context objects live in their own `.ts` files (`cartContextValue.ts`) so the `.tsx` provider files export only components, which keeps React Fast Refresh working.

## Data sources

The product data and photos are collected at build time by `scripts/fetch-catalog.ts`
(`npm run catalog:fetch`). Nothing is fetched at runtime: images live in
`public/images/products/<sku>/` and data is committed to `src/data/products.ts`, so the
app works offline. `src/data/products.ts` and `src/data/sizes.ts` are generated files —
do not edit them by hand; re-run the collector instead.

Collection rules the script follows:

- `robots.txt` of every host is read first and obeyed (paths disallowed there are
  never requested). Only public listing and product pages are requested; never
  account, login, cart, checkout or undocumented API endpoints.
- Requests are sequential, 3 s apart, with a hard cap of 150 requests per run,
  retry with backoff (5s/15s/45s) on 429/5xx, and a stop after 3 consecutive
  failures. Every response is cached under `scripts/.cache/` (gitignored), so
  re-runs for parsing fixes or image retries make no new requests.
- No circumvention: no proxies, no IP rotation, no spoofed fingerprints, no
  stealth plugins, no captcha solving. If a site serves an access-denied or bot
  challenge page, the collector stops that site for the run and reports it.

What was collected (full rules and per-run totals are printed in
`public/CREDITS.md` and logged under `scripts/.cache/run-log*.txt`):

- **Nike** (nike.com German storefront): the Egyptian storefront has no
  browsable catalog (shop paths redirect to the homepage) and the default
  en-us store labels sizes in US, which would conflict with the one size
  system, so the German storefront is used because it lists **EU sizes
  natively**. 14 men's sneaker product pages across the running, basketball,
  lifestyle, training and (Nike SB) skate gridwalls (a successful run
  spent 63 of the 150-request budget; a few sold-out model pages timed out
  and were skipped honestly). Style code as SKU, EUR price converted to EGP
  with a fixed documented rate (1 EUR = 52 EGP), colourway, EU size run with
  thirds, rating where shown, and 4 studio images per pair from Nike's own
  asset CDN (normalised offline, ~56 images / ~2 MB total).
- **adidas Egypt** (adidas.com.eg): NOT collected. Its edge service (Akamai)
  served the collector an automated-security block page on the first attempt
  and hung/challenged every listing page on a second attempt with a real,
  visible logged-out Chrome window. Per the no-circumvention rule no proxies,
  fingerprint spoofing or challenge solving are used, so adidas stays out of
  this snapshot; the script keeps the whole adidas pipeline behind a
  `COLLECT_ADIDAS` flag for a later manual retry.

Real versus derived data:

- Real from the source pages: titles, brand, SKU/style code, current price,
  colourway, studio image URLs, the EU sizes the page marked available, ratings
  where the page shows one, "new" flag where the page shows one.
- Derived for this store: the EU canonical numbers behind "42 2/3"-style labels
  (rounded to 4 decimals), Nike titles (the German storefront's names minus the
  localised family suffix, e.g. "Straßenlaufschuh (Herren)"), 1-2 sentence
  descriptions written from page
  attributes (no marketing text copied), image cropping/normalisation
  (1200x750, white background, WebP), and demo shipping/tax rules for EG
  (VAT 14%, free standard shipping over EGP 10,000) in `src/utils/cart.ts`.
- Not included on purpose: stock quantities (no public counts; the cart caps
  quantity at the MAX_LINE_QUANTITY rule instead), member prices, review texts.

Prices, sizes and availability are a **snapshot** from the collection day, not
live data. This is a non-commercial portfolio demo, not affiliated with or
endorsed by adidas or Nike; product names, images and trademarks belong to their
owners. Re-deploying publicly requires reviewing each source's terms first.
The hero photograph (`assets-src/hero/nike-just-do-it.jpg`, cropped by
`npm run hero:build`) is Nike campaign photography, used for demo purposes only;
the copyright stays with Nike.

Archivo is self-hosted through `@fontsource-variable/archivo`, so there is no
third-party font request.

### Optional remote catalog

Copy `.env.example` to `.env` and set `VITE_PRODUCTS_API_URL` to a URL returning either an array of products or `{ "products": [...] }`. The response is validated field by field. Invalid entries are skipped with a notice; if the request fails, times out (8 s) or contains no valid products, the built-in catalog is used and a notice is shown. Loading and error states are handled in `useProducts`.

## Accessibility

Skip link, focus moved to the main region on route change, visible focus rings (inverted on dark sections), native radios and checkboxes for filters, sizes and shipping, `aria-pressed` on toggles, live regions for bag changes, results counts and the signup password checklist, labelled form errors that do not rely on colour, a focusable error summary on failed login, signup and checkout submits whose items jump to the offending fields (inline errors stay in place), a focus-trapped mobile menu and delete-account dialog closed by Escape, and `prefers-reduced-motion` honoured for both CSS and GSAP.

## Deployment

The build is static (`dist/`).

- **Netlify**: build `npm run build`, publish `dist`. `public/_redirects` handles client-side routes.
- **Vercel**: framework Vite. `vercel.json` rewrites all paths to `index.html`.
- **GitHub Pages / sub-path hosting**: build with `BASE_PATH=/your-repo/ npm run build`. GitHub Pages does not support SPA rewrites, so copy `dist/index.html` to `dist/404.html` after building.

## Known limitations

- The bag and wishlist are restored against the **built-in catalog**. If you enable a remote catalog, items that exist only remotely will not survive a reload.
- Product cards offer quick add from tablet width up. On phones, cards link to the product page, where the size picker has room.
- Checkout is a demo: it takes no payment and sends nothing. A confirmation summary (name, email, city, items, totals) is kept in `localStorage` so the success page survives a reload.
- Prices are EGP (a converted snapshot for Nike; adidas as listed), and shipping and tax are fixed demo rules in `src/utils/cart.ts`.
- Accounts are browser-local demo data, described honestly under "Demo accounts": no server-side auth, no email verification, no password reset.
- Automated checks cover the validation regexes and the auth browser flows only. The rest of the app was verified with the ad hoc browser runs described below.
- Browser testing covered Chromium only.

## Verification performed

`tsc -b` (strict) and `oxlint` report no errors, and `npm run build` succeeds. `npm run i18n:check` keeps the two locales in step, `npm run test:validation` runs 109 regex/validator checks, and `npm run contrast:check` re-checks all 61 colour pairings against WCAG AA together with the palette acceptance numbers (paper at least 1.35:1 and the raised surface at least 1.2:1 away from pure white, chalk a visible step darker than the page). The recolour is guarded by `npm run check:backdrops` (every product photo composites to white/transparent at its edge, so no rectangle can show on the multiply-blended frames) and by two browser audits over every route at 1440 px and 390 px in both locales and both themes: `npm run audit:whites` measured 0.000% of pixels with R, G and B all at/above 245 after the recolour (budget 0.5%; before it, the worst shot read 17.4%), and `npm run audit:elements` walked 19,248 elements with 0 pure-white paints, 0 backgrounds within 1.2:1 of white and 0 unblended images. The auth feature is covered by `npm run verify:auth` (121 browser checks): the signup happy path, every field error, duplicate email, mismatched confirm and unchecked terms, the focusable error summary on login, signup and checkout (focus after a failed submit, items that jump to their fields), the live password checklist, login success and the single generic failure, the persisted 5-failure throttle (countdown, doubling, clearing on success), remember-me on/off storage areas, reload, cross-tab logout and session expiry (on load and on tab focus), `/account` redirects through `returnTo` including hostile values, corrupted storage, a plaintext-password scan of `localStorage`, a keyboard-only signup and login, the delete-account dialog (initial focus, Tab wrap, Escape, focus restore), 390 px overflow, and a regression pass over search, filters, sort, product page, bag, wishlist, guest checkout and signed-in checkout prefill. A headless Chromium run covered every route, search, each filter and sort, the product page (size-required error, quantity cap, gallery, wishlist), quick add, bag edits and removal, persistence across reloads, checkout validation and submission, the confirmation page, the 404 route, corrupted or outdated `localStorage` for all stored keys, the mobile menu (open, Escape, navigation) and horizontal overflow at 390 px wide. The EGP/size-system swap re-checks the same flows with EGP formatting and EU size labels.
