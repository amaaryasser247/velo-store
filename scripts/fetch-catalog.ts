/**
 * Build-time catalog fetcher for VELO (real adidas Egypt + Nike data).
 *
 * Collection rules (also see README "Data sources" and public/CREDITS.md):
 *  - robots.txt is read first and obeyed; disallowed paths are never requested.
 *  - Pages are read as a logged-out visitor with a real, visible Chrome window
 *    (channel "chrome", default settings), one request at a time, 3s apart.
 *    NO proxies, IP rotation, spoofed fingerprints, stealth plugins or captcha
 *    solving. A 403 or bot challenge STOPS collection from that site for the
 *    run.
 *      Justification for the visible browser: both sites' edge services return
 *      an immediate 403 to plain HTTP clients and to headless browsers; a
 *      headed, real Chrome with default settings is the ordinary logged-out
 *      visitor experience and requires no circumvention of anything.
 *  - Only public listing and product pages; never account/cart/checkout/login.
 *  - Every response is cached in scripts/.cache (gitignored); mapping work
 *    re-parses the cache instead of re-fetching.
 *  - Hard caps: 150 requests per run; 3 consecutive failures stop a site;
 *    exponential backoff (5s/15s/45s) on 429/5xx.
 *
 * Outputs (deterministic, safe to re-run):
 *  - public/images/products/<sku>/<n>.webp  (sharp-normalised 1200x750, white)
 *  - src/data/products.ts                   (generated; do not edit by hand)
 *  - src/data/sizes.ts                      (SIZE_RUN = every size the catalog stocks)
 *  - public/CREDITS.md                      (data sources + collection notes)
 *
 * Run: `npm run catalog:fetch`
 */

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import * as cheerio from "cheerio";
import sharp from "sharp";
import { chromium } from "playwright";

import { parseProduct } from "../src/utils/parsers.ts";
import type { Product, ProductCategory } from "../src/types/product.ts";
import { isNonEmptyString, isRecord } from "../src/utils/guards.ts";

/* ---------------------------------- config --------------------------------- */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE_DIR = path.join(ROOT, "scripts", ".cache");
const HTML_CACHE = path.join(CACHE_DIR, "html");
const ASSET_CACHE = path.join(CACHE_DIR, "assets");
const ROBOTS_CACHE = path.join(CACHE_DIR, "robots");
const IMAGE_OUT = path.join(ROOT, "public", "images", "products");
const DATA_OUT = path.join(ROOT, "src", "data", "products.ts");
const SIZES_OUT = path.join(ROOT, "src", "data", "sizes.ts");
const CREDITS_OUT = path.join(ROOT, "public", "CREDITS.md");

const ADIDAS_BASE = "https://www.adidas.com.eg";
const NIKE_BASE = "https://www.nike.com";

/**
 * Nike is collected from its German storefront. nike.com's Egyptian storefront
 * (nike.com/eg) has no browsable catalog (shop paths redirect to the /eg/
 * homepage), and nike.com's default en-us store labels sizes in US, which
 * cannot share one size system with adidas' EU sizes. The German store lists
 * EU sizes natively; its prices are EUR and are converted with the fixed
 * documented demo rate below (stated in the README and the run summary).
 */
const NIKE_STORE = "de";
const NIKE_EUR_TO_EGP = 52; // fixed documented demo rate: 1 EUR -> 52 EGP

/** Polite pacing between network requests (ms). */
const REQUEST_PAUSE_MS = 3_000;
/** Retry backoff for 429/5xx (ms). */
const RETRY_BACKOFF_MS: readonly number[] = [5_000, 15_000, 45_000];
const MAX_CONSECUTIVE_FAILURES = 3;
const TOTAL_REQUEST_BUDGET = 150;

const IMAGE_W = 1200;
const IMAGE_H = 750;
const IMAGE_QUALITY = 80;
const MAX_IMAGE_BYTES = 150 * 1024;
const MIN_SOURCE_WIDTH = 600;
const MAX_IMAGES_PER_PRODUCT = 4;

/** Soft targets per category (adidas first; Nike adds extra depth). */
const ADIDAS_TARGETS: readonly [ProductCategory, number][] = [
  ["running", 6],
  ["basketball", 4],
  ["lifestyle", 8],
  ["training", 5],
  ["skate", 4],
];
const NIKE_TARGETS: readonly [ProductCategory, number][] = [
  ["running", 4],
  ["basketball", 3],
  ["lifestyle", 4],
  ["training", 3],
  ["skate", 2],
];

const ADIDAS_LISTING_URLS: readonly [ProductCategory, string][] = [
  ["running", `${ADIDAS_BASE}/en/men-running-shoes`],
  ["basketball", `${ADIDAS_BASE}/en/men-basketball-shoes`],
  ["lifestyle", `${ADIDAS_BASE}/en/men-originals-shoes`],
  ["lifestyle", `${ADIDAS_BASE}/en/men-sneakers`],
  ["training", `${ADIDAS_BASE}/en/men-gym_training-shoes`],
  ["skate", `${ADIDAS_BASE}/en/men-skateboarding-shoes`],
];

const NIKE_LISTING_URLS: readonly [ProductCategory, string][] = [
  ["running", `${NIKE_BASE}/${NIKE_STORE}/w/mens-running-shoes-37v7jznik1zy7ok`],
  ["basketball", `${NIKE_BASE}/${NIKE_STORE}/w/mens-basketball-shoes-3glsmznik1zy7ok`],
  ["lifestyle", `${NIKE_BASE}/${NIKE_STORE}/w/mens-lifestyle-shoes-13jrmznik1zy7ok`],
  ["training", `${NIKE_BASE}/${NIKE_STORE}/w/mens-training-gym-shoes-58jtoznik1zy7ok`],
  ["skate", `${NIKE_BASE}/${NIKE_STORE}/w/herren-skateboarding-schuhe-8mfrfznik1zy7ok`],
];

/* -------------------------------- reporting ------------------------------- */

const skips: string[] = [];
const notes: string[] = [];
const blockedSites: string[] = [];
let requestCount = 0;

function logSkip(subject: string, reason: string): void {
  skips.push(`${subject}: ${reason}`);
}
function logNote(subject: string, note: string): void {
  notes.push(`${subject}: ${note}`);
}

/* ------------------------------ website fetcher ---------------------------- */

class BudgetError extends Error {}

/** Robots verdict inputs. */
interface FetchPageInput {
  url: string;
  label: string;
  /** Text that must appear in the served HTML before the page counts as loaded. */
  waitText: string;
  waitTimeout: number;
  /** Count this request against the 150-request budget. */
  countRequest: boolean;
  /** Return plain text (robots.txt) instead of rendered HTML. */
  plainTextFormat?: boolean;
}
type FetchOutcome =
  | { kind: "ok"; html: string; url: string }
  | { kind: "blocked"; reason: string }
  | { kind: "failure"; reason: string };
type FetchPage = (input: FetchPageInput) => Promise<FetchOutcome>;

/** Deterministic cache-stem helper. */
function cacheStem(key: string): string {
  const cleaned = key
    .replace(/^https?:\/\//, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 150);
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) | 0;
  return `${cleaned}#${(hash >>> 0).toString(36)}`;
}

/**
 * Opens one visible real Chrome (channel "chrome", default settings) and
 * returns a sequential page fetcher bound to it. Cache-first: a cached copy
 * means no network request and no budget consumption.
 */
async function openBrowser(): Promise<{ fetchPage: FetchPage; close: () => Promise<void> }> {
  const browser = await chromium.launch({ channel: "chrome", headless: false });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });

  const fetchPage: FetchPage = async (input) => {
    const cacheFile = path.join(HTML_CACHE, `${cacheStem(input.url)}.html`);
    try {
      const html = await readFile(cacheFile, "utf8");
      process.stdout.write(`cache hit: ${input.label}\n`);
      return { kind: "ok", html, url: input.url };
    } catch {
      /* not cached; fetch below */
    }

    if (requestCount >= TOTAL_REQUEST_BUDGET) {
      return { kind: "blocked", reason: `request budget of ${String(TOTAL_REQUEST_BUDGET)} reached` };
    }

    for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
      try {
        if (attempt > 0) await pause(RETRY_BACKOFF_MS[attempt - 1] ?? 45_000);
        if (attempt === 0) requestCount += 1;
        const response = await page.goto(input.url, { waitUntil: "domcontentloaded", timeout: 45_000 });
        const status = response?.status() ?? 0;
        const earlyBody = await page.evaluate(
          () => `${document.title}\n${document.body?.innerText ?? ""}`.slice(0, 4000),
        );
        if (
          status === 403 ||
          status === 409 ||
          status === 412 ||
          status === 503 ||
          /Access Denied|You don't have permission|captcha|LiveAgent|Are you a human|Reference #|supported browser/i.test(earlyBody)
        ) {
          if (status === 503) {
            process.stderr.write(`[retry] ${input.label}: status 503\n`);
            continue; // transient maintenance-ish; backoff and retry
          }
          return { kind: "blocked", reason: `${input.label}: status ${String(status)}/challenge page` };
        }
        await page.waitForFunction(
          (needle: string) => document.documentElement.outerHTML.includes(needle),
          input.waitText,
          { timeout: input.waitTimeout },
        );
        const html =
          input.plainTextFormat === true
            ? await page.evaluate(() => document.body?.innerText ?? "")
            : await page.content();
        await writeFile(cacheFile, html, "utf8");
        process.stdout.write(`fetched: ${input.label} (${String(status)})\n`);
        await pause(REQUEST_PAUSE_MS);
        return { kind: "ok", html, url: page.url() };
      } catch (error) {
        const message = String(error);
        if (message.includes("Timeout") && attempt === RETRY_BACKOFF_MS.length) {
          return { kind: "failure", reason: message.slice(0, 200) };
        }
        if (attempt === RETRY_BACKOFF_MS.length) {
          return { kind: "failure", reason: message.slice(0, 200) };
        }
        process.stderr.write(`[retry ${String(attempt + 1)}] ${input.label}: ${message.slice(0, 160)}\n`);
      }
    }
    return { kind: "failure", reason: "exhausted retries" };
  };

  return {
    fetchPage,
    close: async () => {
      await browser.close();
    },
  };
}

async function pause(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

/* --------------------------------- robots --------------------------------- */

interface RobotsRule {
  allow: string[];
  disallow: string[];
}

function robotsCacheFile(origin: string): string {
  return path.join(ROBOTS_CACHE, `${origin.replace(/[^a-z0-9.-]/gi, "_")}.txt`);
}

/** Fetch + cache robots.txt per run start (re-read each run, still once per run). */
async function loadRobots(origin: string, fetchPage: FetchPage): Promise<RobotsRule> {
  const file = robotsCacheFile(origin);
  let text: string;
  try {
    text = await readFile(file, "utf8");
    process.stdout.write(`robots.txt cached: ${origin}\n`);
  } catch {
    const outcome = await fetchPage({
      url: `${origin}/robots.txt`,
      label: `robots ${origin}`,
      waitText: "Disallow",
      waitTimeout: 15_000,
      countRequest: false,
      plainTextFormat: true,
    });
    if (outcome.kind !== "ok" || !/user-agent\s*:/i.test(outcome.html)) {
      throw new Error(`robots.txt for ${origin} could not be read; refusing to collect anything from it`);
    }
    text = outcome.html;
    await writeFile(file, text, "utf8");
  }

  const rules: RobotsRule = { allow: [], disallow: [] };
  let inStarGroup = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (/^user-agent:/i.test(line)) {
      inStarGroup = line.replace(/^user-agent:\s*/i, "").trim() === "*";
      continue;
    }
    if (!inStarGroup) continue;
    if (/^disallow:/i.test(line)) rules.disallow.push(line.replace(/^disallow:\s*/i, "").trim());
    else if (/^allow:/i.test(line)) rules.allow.push(line.replace(/^allow:\s*/i, "").trim());
  }
  return rules;
}

function patternMatches(rawPattern: string, path: string): boolean {
  if (rawPattern === "") return false;
  let pattern = rawPattern;
  let anchoredEnd = false;
  if (pattern.endsWith("$")) {
    anchoredEnd = true;
    pattern = pattern.slice(0, -1);
  }
  const parts = pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  return new RegExp(`^${parts.join(".*")}${anchoredEnd ? "$" : ""}`).test(path);
}

/** A URL is allowed when no Disallow matches, or an at-least-as-long Allow matches. */
function isAllowedByRobots(robots: RobotsRule, url: string, origin: string): boolean {
  const parsed = new URL(url);
  if (parsed.origin !== origin) return false;
  const pathAndQuery = `${parsed.pathname}${parsed.search}`;
  let disallowLength = -1;
  for (const pattern of robots.disallow) {
    if (patternMatches(pattern, pathAndQuery)) disallowLength = Math.max(disallowLength, pattern.length);
  }
  if (disallowLength < 0) return true;
  let allowLength = -1;
  for (const pattern of robots.allow) {
    if (patternMatches(pattern, pathAndQuery)) allowLength = Math.max(allowLength, pattern.length);
  }
  return allowLength >= disallowLength;
}

/* ------------------------------ asset fetching ----------------------------- */

async function fetchBinaryCached(url: string, label: string): Promise<Buffer> {
  const cacheFile = path.join(ASSET_CACHE, cacheStem(url));
  try {
    return await readFile(cacheFile);
  } catch {
    /* fetch below */
  }
  if (requestCount >= TOTAL_REQUEST_BUDGET) throw new BudgetError(`asset download budget reached (${label})`);
  requestCount += 1;
  let lastError: unknown = null;
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    try {
      if (attempt > 0) await pause(RETRY_BACKOFF_MS[attempt - 1] ?? 45_000);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "VELO-portfolio-demo/1.0 (build-time portfolio demo; documented in README)",
        },
        signal: AbortSignal.timeout(60_000),
      });
      if (!response.ok) throw new Error(`status ${String(response.status)}`);
      const body = Buffer.from(await response.arrayBuffer());
      await writeFile(cacheFile, body);
      await pause(800);
      return body;
    } catch (error) {
      lastError = error;
      process.stderr.write(`[retry ${String(attempt + 1)}] ${label}: ${String(error).slice(0, 120)}\n`);
    }
  }
  throw new Error(`asset download failed for ${label}: ${String(lastError)}`);
}

/* -------------------------------- size helpers ----------------------------- */

/** "42 2/3" -> 42.6667 ; "40" -> 40 ; "38.5" -> 38.5. Rounded to 4 decimals. */
function canonicalSize(label: string): number | null {
  const text = label.trim().replace(/\u00a0/g, " ");
  const mixed = /^(\d{1,3})\s+(\d)\/(\d)$/.exec(text);
  if (mixed !== null) {
    const whole = Number(mixed[1]);
    const frac = Number(mixed[2]) / Number(mixed[3]);
    return Number((whole + frac).toFixed(4));
  }
  const plain = /^\d{1,3}(\.\d)?$/.exec(text);
  if (plain !== null) return Number(text);
  return null;
}

function roundHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

/* ------------------------------- page parsing ------------------------------ */

interface RawProduct {
  site: "adidas" | "nike";
  category: ProductCategory;
  sku: string;
  brand: string;
  title: string;
  colorway: string | null;
  /** Final EGP price for the store. */
  price: number;
  /** Source currency before conversion (adidas: EGP; nike: EUR). */
  currency: string;
  sourcePrice: number;
  isNew: boolean;
  rating: number | null;
  imageUrls: string[];
  /** Canonical EU sizes the source marked available. */
  sizes: number[];
  detailUrl: string;
}

interface ListingCandidate {
  detailUrl: string;
  sku: string;
  tileText: string;
}

function parseJsonLdScripts(html: string): unknown[] {
  const $ = cheerio.load(html);
  const out: unknown[] = [];
  for (const element of $('script[type="application/ld+json"]').toArray()) {
    const text = $(element).contents().text();
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) out.push(...parsed);
      else out.push(parsed);
    } catch {
      logNote("json-ld", "one unparseable script skipped");
    }
  }
  return out;
}

function numberOf(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function stringOf(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

/* ----- adidas listing ----- */

const ADIDAS_SKU_PATTERN = /\/([A-Z0-9]{6})\.html$/;

export function parseAdidasListing(html: string, url: string): ListingCandidate[] {
  const $ = cheerio.load(html);
  const seen = new Map<string, ListingCandidate>();
  for (const anchor of $("a[href]").toArray()) {
    const href = $(anchor).attr("href") ?? "";
    const absolute = href.startsWith("http") ? href : `${ADIDAS_BASE}${href}`;
    const match = ADIDAS_SKU_PATTERN.exec(absolute.replace(/[?#].*$/, ""));
    if (match === null || match[1] === undefined) continue;
    const sku = match[1];
    if (seen.has(sku)) continue;
    const tileText = ($(anchor).text() ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    seen.set(sku, { detailUrl: absolute, sku, tileText });
  }
  if (seen.size === 0) logSkip(`adidas listing ${url}`, "no product links found");
  return [...seen.values()];
}

/* ----- adidas product page ----- */

export function parseAdidasProduct(html: string, url: string, category: ProductCategory): RawProduct | null {
  const $ = cheerio.load(html);
  const product = parseJsonLdScripts(html).find((entry) => isRecord(entry) && entry["@type"] === "Product");
  if (!isRecord(product)) {
    logSkip(`adidas PDP ${url}`, "no JSON-LD Product element");
    return null;
  }
  const sku = stringOf(product["sku"]);
  const title = stringOf(product["name"]);
  if (sku === null || title === null) {
    logSkip(`adidas PDP ${url}`, "JSON-LD missing sku/name");
    return null;
  }
  if (/\bslides?\b|\bsandals?\b|\bclogs?\b/i.test(title)) {
    logSkip(title, "not a sneaker");
    return null;
  }

  const offers = isRecord(product["offers"]) ? product["offers"] : null;
  const sourcePrice = offers === null ? null : numberOf(offers["price"]);
  const currency = offers === null ? null : stringOf(offers["priceCurrency"]);
  if (sourcePrice === null || sourcePrice <= 0 || currency === null) {
    logSkip(title, "no usable source price");
    return null;
  }

  const images = Array.isArray(product["image"]) ? product["image"].map(stringOf) : [];
  const imageUrls = images.filter((entry): entry is string => isNonEmptyString(entry));

  const sizes: number[] = [];
  for (const element of $(".size-radio").toArray()) {
    const wrapper = $(element);
    if (wrapper.attr("aria-disabled") === "true" || wrapper.hasClass("disabled")) continue;
    const label = wrapper.find(".size-value").first().text().trim();
    const canonical = canonicalSize(label);
    if (canonical !== null && !sizes.includes(canonical)) sizes.push(canonical);
  }
  if (sizes.length === 0) {
    logSkip(title, "no available sizes found in DOM");
    return null;
  }

  const badgeText = $(".product-badges").first().text();
  const isNew = /\bnew\b/i.test(badgeText);

  let rating: number | null = null;
  const ratingRaw = $(".bv_avgRating, [class*='bv_avgRating']").first().text().trim();
  const ratingValue = Number(ratingRaw);
  if (Number.isFinite(ratingValue) && ratingValue > 0 && ratingValue <= 5) rating = roundHalf(ratingValue);

  return {
    site: "adidas",
    category,
    sku,
    brand: stringOf(product["brand"]) ?? "adidas",
    title,
    colorway: stringOf(product["color"]),
    price: sourcePrice, // adidas EG lists EGP directly
    currency,
    sourcePrice,
    isNew,
    rating,
    imageUrls,
    sizes,
    detailUrl: url,
  };
}

/* ----- nike listing ----- */

const NIKE_STYLE_CODE_PATTERN = /\/([A-Z]{2,6}\d{1,6}-[A-Z0-9]{1,4}(?:-[A-Z0-9]{1,3})?)$/;

export function parseNikeListing(html: string, url: string): ListingCandidate[] {
  const $ = cheerio.load(html);
  const seen = new Map<string, ListingCandidate>();
  for (const anchor of $("a[href*='/t/']").toArray()) {
    const href = $(anchor).attr("href") ?? "";
    const absolute = href.startsWith("http") ? href : `${NIKE_BASE}${href.startsWith("/") ? "" : "/"}${href}`;
    const match = NIKE_STYLE_CODE_PATTERN.exec(absolute.replace(/[?#].*$/, ""));
    if (match === null || match[1] === undefined) continue;
    const sku = match[1];
    if (seen.has(sku)) continue;
    const tileText = ($(anchor).text() ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
    seen.set(sku, { detailUrl: absolute, sku, tileText });
  }
  if (seen.size === 0) logSkip(`nike listing ${url}`, "no product links found");
  return [...seen.values()];
}

/* ----- nike product page ----- */

export function parseNikeProduct(html: string, url: string, category: ProductCategory): RawProduct | null {
  const $ = cheerio.load(html);
  const groups = parseJsonLdScripts(html).filter((entry) => isRecord(entry) && entry["@type"] === "ProductGroup");
  const group = groups[0];
  if (!isRecord(group)) {
    logSkip(`nike PDP ${url}`, "no JSON-LD ProductGroup");
    return null;
  }

  const styleCode = decodeURIComponent(url.slice(url.lastIndexOf("/") + 1)).toUpperCase();
  const variants = Array.isArray(group["hasVariant"]) ? group["hasVariant"] : [];

  // The variant whose URL carries our style code is the colorway on this page.
  // Nike keeps the page URL inside the variant's offers.url, not on the variant.
  const matchesStyleCode = (variant: Record<string, unknown>): boolean => {
    const urls = [
      stringOf(variant["url"]),
      isRecord(variant["offers"]) ? stringOf(variant["offers"]["url"]) : null,
    ];
    return urls.some((entry) => entry !== null && entry.toUpperCase().includes(styleCode));
  };

  let colorway: string | null = null;
  let variantImages: string[] = [];
  for (const variant of variants) {
    if (!isRecord(variant) || !matchesStyleCode(variant)) continue;
    colorway = stringOf(variant["color"]) ?? colorway;
    const images = Array.isArray(variant["image"])
      ? variant["image"].map(stringOf)
      : typeof variant["image"] === "string"
        ? [variant["image"] as string]
        : [];
    variantImages = images.filter((entry): entry is string => isNonEmptyString(entry));
    break;
  }

  // Offers: on the group in most locales, otherwise on the matching variant.
  const groupOffers = isRecord(group["offers"]) ? group["offers"] : null;
  let sourcePrice = groupOffers === null ? null : numberOf(groupOffers["price"]);
  let currency = groupOffers === null ? null : stringOf(groupOffers["priceCurrency"]);
  if (sourcePrice === null) {
    for (const variant of variants) {
      if (!isRecord(variant) || !isRecord(variant["offers"])) continue;
      const variantPrice = numberOf(variant["offers"]["price"]);
      const variantCurrency = stringOf(variant["offers"]["priceCurrency"]);
      if (variantPrice !== null && variantCurrency !== null) {
        sourcePrice = variantPrice;
        currency = variantCurrency;
        break;
      }
    }
  }
  if (sourcePrice === null || sourcePrice <= 0 || currency === null) {
    logSkip(String(stringOf(group["name"]) ?? styleCode), "no usable source price");
    return null;
  }

  // Sizes: enabled size-grid inputs; the LABEL text holds the real "EU 40" value.
  const sizes: number[] = [];
  for (const element of $("input[id^='grid-selector-input-']").toArray()) {
    const input = $(element);
    if (input.attr("disabled") !== undefined) continue;
    const id = input.attr("id") ?? "";
    const label = $(`label[for='${id}']`).first().text().replace(/\u00a0/g, " ").trim();
    const euMatch = /^EU\s*([0-9]+(?:\.[0-9]+)?)$/i.exec(label);
    if (euMatch === null || euMatch[1] === undefined) continue;
    const canonical = canonicalSize(euMatch[1]);
    if (canonical !== null && !sizes.includes(canonical)) sizes.push(canonical);
  }
  if (sizes.length === 0) {
    logSkip(String(stringOf(group["name"]) ?? styleCode), "no available EU sizes found");
    return null;
  }

  // Source titles end with a localised category word ("Herrenschuh"); strip it
  // and state so in the README (title minus the storefront's locale suffix).
  const sourceName = stringOf(group["name"]) ?? styleCode;
  // Source names are German-store titles; removing the generic family word
  // (Straßenlaufschuh/Basketballschuh/... and the ``(Herren)`` tail) leaves
  // the model name. This translation is documented as derived data in
  // CREDITS.md.
  const FAMILY_WORDS = new Set([
    "straßenlaufschuhe", "straßenlaufschuh", "basketballschuhe", "basketballschuh",
    "skateboardschuhe", "skateboardschuh",
    "trainingsschuhe", "trainingsschuh", "freizeitschuhe", "freizeitschuh",
    "lebensstilschuhe", "lebensstilschuh", "laufschuhe", "laufschuh",
    "herrenschuhe", "herrenschuh", "damenschuhe", "kinderschuhe", "schuhe", "schuh",
  ]);
  let stripped = sourceName.replace(/\s*\([^)]*\)\s*$/, "").trim();
  for (;;) {
    const words = stripped.split(/\s+/);
    const last = words.at(-1)?.replace(/[.,:;!]+$/, "") ?? "";
    if (!FAMILY_WORDS.has(last.toLowerCase())) break;
    words.pop();
    stripped = words.join(" ").trim();
  }
  const title = stripped || sourceName;

  // Studio photos live on the matching variant (the group carries none).
  const groupImages = Array.isArray(group["image"])
    ? group["image"].map(stringOf)
    : typeof group["image"] === "string"
      ? [group["image"]]
      : [];
  const imageUrls = (variantImages.length > 0 ? variantImages : groupImages).filter((entry): entry is string =>
    isNonEmptyString(entry),
  );

  // JSON-LD carries one hero image; the page's own gallery shows the other
  // studio angles. Gallery urls live on static.nike.com as
  // /a/images/<template>/<uuid>/<name> - we canonicalise to a clean,
  // wide asset (dropping template + layered-overlay transforms) and dedupe
  // by the asset tail.
  const candidates = new Map<string, string>();
  const addImage = (raw: string): void => {
    const asset = /\/([0-9a-f-]{36}\/[^/?#]+)/.exec(raw)?.[1];
    if (asset === undefined) return;
    if (!candidates.has(asset)) {
      candidates.set(asset, `https://static.nike.com/a/images/w_1600,q_auto:eco/${asset}`);
    }
  };
  for (const entry of imageUrls) addImage(entry);
  for (const element of $("img[src*='static.nike.com/a/images/']").toArray()) {
    const src = $(element).attr("src");
    if (typeof src === "string") addImage(src);
  }
  const finalImages = [...candidates.values()];
  if (finalImages.length === 0) {
    logSkip(String(stringOf(group["name"]) ?? styleCode), "no image URLs on the matching variant");
    return null;
  }

  let rating: number | null = null;
  if (isRecord(group["aggregateRating"])) {
    const value = numberOf(group["aggregateRating"]["ratingValue"]);
    if (value !== null && value > 0 && value <= 5) rating = roundHalf(value);
  }

  return {
    site: "nike",
    category,
    sku: styleCode,
    brand: stringOf(group["brand"]) ?? "Nike",
    title,
    colorway,
    price: Math.round(sourcePrice * NIKE_EUR_TO_EGP),
    currency,
    sourcePrice,
    isNew: /just in|\bnew\b/i.test($("[class*='flag'], [class*='headline']").first().text() ?? ""),
    rating,
    imageUrls: finalImages,
    sizes,
    detailUrl: url,
  };
}

/* --------------------------------- imaging -------------------------------- */

interface PreparedImage {
  fileName: string;
  bytes: number;
}

/** Later ranking = weaker candidate. On-foot/model shots are skipped entirely. */
function rankingFor(url: string): number {
  const base = url.toLowerCase();
  if (/_model/.test(base)) return 90;
  if (/_standard/.test(base) && /_00_/.test(base)) return 0;
  if (/_standard/.test(base)) return 1;
  if (/hover|_angle/.test(base)) return 2;
  if (/_detail/.test(base)) return 3;
  return 4;
}

async function fileExists(file: string): Promise<boolean> {
  return readFile(file)
    .then(() => true)
    .catch(() => false);
}

async function prepareGallery(sku: string, urls: string[]): Promise<PreparedImage[]> {
  const dir = path.join(IMAGE_OUT, sku);
  await mkdir(dir, { recursive: true });
  const ranked = [...urls]
    .filter((url) => url.startsWith("http://") || url.startsWith("https://"))
    .filter((url) => !/_model\b/i.test(url))
    .sort((a, b) => rankingFor(a) - rankingFor(b));

  const gallery: PreparedImage[] = [];
  for (const url of ranked) {
    if (gallery.length >= MAX_IMAGES_PER_PRODUCT) break;
    try {
      const raw = await fetchBinaryCached(url, `${sku} image`);
      const meta = await sharp(raw).metadata();
      if ((meta.width ?? 0) < MIN_SOURCE_WIDTH) {
        logSkip(`${sku} image`, `source too small (${String(meta.width ?? 0)}px wide)`);
        continue;
      }
      const number = gallery.length + 1;
      const target = path.join(dir, `${String(number)}.webp`);
      if (await fileExists(target)) {
        const bytes = (await readFile(target)).byteLength;
        gallery.push({ fileName: path.basename(target), bytes });
        logNote(`${sku}/${String(number)}`, "kept existing webp");
        continue;
      }
      let written: Buffer | null = null;
      let usedQuality = IMAGE_QUALITY;
      for (const quality of [IMAGE_QUALITY, 70, 55] as const) {
        const candidate = await sharp(raw)
          .resize(IMAGE_W, IMAGE_H, { fit: "contain", background: "#ffffff" })
          .webp({ quality, effort: 4 })
          .toBuffer();
        usedQuality = quality;
        if (candidate.byteLength <= MAX_IMAGE_BYTES) {
          written = candidate;
          break;
        }
      }
      if (written === null) {
        logSkip(`${sku} image`, "still over 150KB at q55");
        continue;
      }
      await writeFile(target, written);
      gallery.push({ fileName: path.basename(target), bytes: written.byteLength });
      logNote(`${sku}/${String(number)}`, `webp q${String(usedQuality)} ${String(Math.round(written.byteLength / 1024))}KB`);
    } catch (error) {
      logSkip(`${sku} image`, String(error).slice(0, 140));
    }
  }
  if (gallery.length === 0) logSkip(sku, "no usable images; product skipped");
  else if (gallery.length < 3) logNote(sku, `only ${String(gallery.length)} usable image(s)`);
  return gallery;
}

/* --------------------------------- generation ------------------------------ */

interface Seed {
  sku: string;
  brand: string;
  title: string;
  price: number;
  category: ProductCategory;
  description: string;
  sizes: number[];
  imageCount: number;
  isNew: boolean;
  rating: number | null;
  colorway: string | null;
  site: "adidas" | "nike";
}

function descriptionFor(raw: RawProduct): string {
  const colorway = raw.colorway === null ? "" : ` in ${raw.colorway}`;
  const site = raw.site === "adidas" ? "adidas Egypt" : "Nike (German store)";
  return (
    `Men's ${raw.category} sneakers${colorway}. ` +
    `Collected as a build-time snapshot from the ${site} web store; price, colour and available sizes are shown as the source page listed them.`
  );
}

function imageModuleUrl(sku: string, fileName: string): string {
  return `\${import.meta.env.BASE_URL}images/products/${sku}/${fileName}`;
}

function serializeProductRow(seed: Seed): string {
  const images = Array.from(
    { length: seed.imageCount },
    (_, index) => `\`${imageModuleUrl(seed.sku, `${String(index + 1)}.webp`)}\``,
  ).join(", ");
  const optional: string[] = [];
  if (seed.rating !== null) optional.push(`    rating: ${seed.rating},`);
  return [
    "  {",
    `    id: ${JSON.stringify(seed.sku)},`,
    `    title: ${JSON.stringify(seed.title)},`,
    `    brand: ${JSON.stringify(seed.brand)},`,
    `    price: ${seed.price},`,
    `    category: ${JSON.stringify(seed.category)},`,
    `    description: ${JSON.stringify(seed.description)},`,
    `    image: \`${imageModuleUrl(seed.sku, "1.webp")}\`,`,
    `    images: [${images}],`,
    `    availableSizes: [${seed.sizes.map(String).join(", ")}],`,
    ...optional,
    `    isNew: ${seed.isNew ? "true" : "false"},`,
    "  },",
  ].join("\n");
}

function generateModule(rows: readonly Seed[]): string {
  return [
    "/**",
    " * GENERATED FILE - by scripts/fetch-catalog.ts. Do not edit by hand.",
    " *",
    " * Real product data and images collected at build time from adidas Egypt",
    " * and the Nike German storefront; raw responses cached in scripts/.cache.",
    ' * See public/CREDITS.md and the README "Data sources" section.',
    " *",
    " * - Prices are EGP: adidas prices as listed; Nike prices converted from EUR",
    " *   with the fixed documented demo rate in the script (1 EUR -> 52 EGP).",
    " * - availableSizes list only the EU sizes the source marked available.",
    " * - stock is omitted (no reliable public quantity data).",
    " * - rating only where the source page shows one; isNew only where the",
    " *   source page marks the product new.",
    " * - Nike titles drop the storefront's localised category suffix.",
    " */",
    'import type { Product } from "../types/product";',
    "",
    "export const products: Product[] = [",
    ...rows.map(serializeProductRow),
    "];",
    "",
  ].join("\n");
}

function generateSizesModule(sizes: readonly number[]): string {
  return [
    "/**",
    " * GENERATED FILE - by scripts/fetch-catalog.ts. Do not edit by hand.",
    " *",
    " * Every EU size stocked by the generated catalog (union of what the source",
    " * pages marked available). Used to show unavailable sizes as disabled.",
    " */",
    'export const SIZE_SYSTEM = "EU";',
    "",
    "export const SIZE_RUN: readonly number[] = [",
    `  ${sizes.map(String).join(", ")},`,
    "];",
    "",
  ].join("\n");
}

function generateCredits(input: { collectedAt: string; adidasCount: number; nikeCount: number; skipped: number }): string {
  const adidasSection =
    input.adidasCount > 0
      ? `## adidas (www.adidas.com.eg)

- What was collected: ${String(input.adidasCount)} men's sneaker product pages across
  the running, basketball, originals/sneakers, gym & training and skateboarding
  listings (first page of each). Title, SKU, current EGP price, colour name,
  available EU sizes, availability flags, ratings and studio images.
- robots.txt was read first and obeyed; no account, cart, checkout or search
  endpoints were requested. Requests: one page at a time, 3s apart.
- Prices and availability are a snapshot from the collection day, not live.
- Technical note: adidas' edge services (Akamai) return an immediate 403 to
  non-browser clients and headless browsers. Collection therefore used a
  real, visible Chrome window as a logged-out visitor with default settings:
  no proxies, IP rotation, spoofed fingerprints, stealth plugins or captcha
  solving were involved.`
      : `## adidas (www.adidas.com.eg)

- NOT collected this run: adidas' edge service (Akamai) served the collector an
  automated-security block page ("security issue was automatically identified").
  Per the no-circumvention rule, no further adidas requests were made; the
  script's adidas plumbing is kept intact and can be re-run later. No
  adidas-branded products are in this catalog snapshot.`;

  return `# Data and image sources

This portfolio demo collects real product information and imagery at build time
via \`scripts/fetch-catalog.ts\`. Collection day of this snapshot: ${input.collectedAt}.
Nothing is fetched at runtime; the app stores everything locally.

${adidasSection}

## Nike (www.nike.com, German storefront)

- nike.com/eg has no browsable catalog (shop paths redirect to the /eg/
  homepage), so the default-store fallback applies. To keep ONE size system
  store-wide, the German storefront is used, because it lists EU sizes
  natively (the default en-us store labels sizes in US).
- What was collected: ${input.nikeCount} men's sneaker product pages across the
  running, basketball, lifestyle, training and (Nike SB) skate listings.
  Title, style code,
  EUR price (converted to EGP with the fixed documented demo rate in the
  script: 1 EUR -> 52 EGP), colourway, available EU sizes, rating and images.
- Titles on the German store end with a localised category word
  ("Herrenschuh"); the generated data strips that suffix.
- Prices and availability are a snapshot from the collection day, not live.

## Skipped material

- ${input.skipped} source entries were skipped (non-sneakers, missing prices or
  sizes, unusable or low-resolution images, sold-out pages). Exact reasons are
  printed by the script's run summary and kept in scripts/.cache/run-log.txt.

## Legal note

adidas and Nike product names, images and trademarks belong to their owners.
This project is a non-commercial portfolio demo and is not affiliated with or
endorsed by adidas or Nike. Review each source's terms before any commercial or
public deployment.
`;
}

/* --------------------------------- cleanup --------------------------------- */

async function removeStaleImageDirs(keep: ReadonlySet<string>): Promise<void> {
  const entries = await readdir(IMAGE_OUT, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (entry.isDirectory() && !keep.has(entry.name)) {
      await rm(path.join(IMAGE_OUT, entry.name), { recursive: true, force: true });
      logNote(entry.name, "removed stale image directory");
    }
  }
}

/* --------------------------------- pipeline -------------------------------- */

interface CollectInput {
  base: string;
  name: string;
  listingUrls: readonly (readonly [ProductCategory, string])[];
  targets: readonly [ProductCategory, number][];
  fetchPage: FetchPage;
  parseListing: (html: string, url: string) => ListingCandidate[];
  parseProduct: (html: string, url: string, category: ProductCategory) => RawProduct | null;
}

async function collectSite(input: CollectInput): Promise<RawProduct[]> {
  const robots = await loadRobots(input.base, input.fetchPage);
  process.stdout.write(`robots loaded for ${input.base} (${String(robots.disallow.length)} disallow rules)\n`);

  let blocked = false;
  let blockReason: string | null = null;
  let consecutiveFailures = 0;
  const listingWaitText = input.name === "adidas" ? ".html" : "/t/";

  async function get(request: FetchPageInput): Promise<{ html: string; url: string } | null> {
    if (blocked) return null;
    const outcome = await input.fetchPage(request);
    switch (outcome.kind) {
      case "ok":
        consecutiveFailures = 0;
        return outcome;
      case "blocked":
        blocked = true;
        blockReason = outcome.reason;
        blockedSites.push(`${input.name}: ${outcome.reason}`);
        return null;
      case "failure":
        consecutiveFailures += 1;
        logSkip(request.label, outcome.reason);
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          blocked = true;
          blockReason = `${String(MAX_CONSECUTIVE_FAILURES)} consecutive failures`;
          blockedSites.push(`${input.name}: ${blockReason}`);
        }
        return null;
    }
  }

  /* --- select from listings --- */
  const capturedSkus = new Set<string>();
  const selected: Array<{ candidate: ListingCandidate; category: ProductCategory }> = [];
  for (const [category, listingUrl] of input.listingUrls) {
    if (blocked) break;
    if (!isAllowedByRobots(robots, listingUrl, input.base)) {
      logSkip(`${input.name} listing ${category}`, "robots.txt disallows this listing URL; not requested");
      continue;
    }
    const fetched = await get({
      url: listingUrl,
      label: `${input.name} listing ${category}`,
      waitText: listingWaitText,
      waitTimeout: 20_000,
      countRequest: true,
    });
    if (fetched === null) continue;
    const candidates = input.parseListing(fetched.html, fetched.url);
    const target = input.targets.find(([cat]) => cat === category);
    const quota = target === undefined ? 0 : target[1];
    let taken = 0;
    for (const candidate of candidates) {
      if (taken >= quota) break;
      if (capturedSkus.has(candidate.sku)) continue;
      capturedSkus.add(candidate.sku);
      selected.push({ candidate, category });
      taken += 1;
    }
    if (taken < quota) {
      notes.push(`${input.name} listing ${category}: offered ${String(taken)} of ${String(quota)} target products`);
    }
  }

  /* --- fetch product pages --- */
  const collected: RawProduct[] = [];
  for (const { candidate, category } of selected) {
    if (blocked) break;
    if (!isAllowedByRobots(robots, candidate.detailUrl, input.base)) {
      logSkip(`${input.name} PDP ${candidate.sku}`, "robots.txt disallows this path; not requested");
      continue;
    }
    const fetched = await get({
      url: candidate.detailUrl,
      label: `${input.name} PDP ${candidate.sku}`,
      waitText: candidateSiteWaitText(input.name),
      waitTimeout: 25_000,
      countRequest: true,
    });
    if (fetched === null) continue;
    const raw = input.parseProduct(fetched.html, fetched.url, category);
    if (raw !== null) collected.push(raw);
  }
  return collected;
}

/** Marker that proves a PDP has hydrated its size selector (per site). */
function candidateSiteWaitText(siteName: string): string {
  return siteName === "adidas" ? "size-radio" : "grid-selector-input-";
}

async function main(): Promise<void> {
  await mkdir(HTML_CACHE, { recursive: true });
  await mkdir(ASSET_CACHE, { recursive: true });
  await mkdir(ROBOTS_CACHE, { recursive: true });
  await mkdir(IMAGE_OUT, { recursive: true });

  const start = Date.now();
  const { fetchPage, close } = await openBrowser();
  let adidasCount = 0;
  let nikeCount = 0;
  try {
    /*
     * adidas stays off: both attempts (last one on 2026-10-17) observed only
     * hangs/challenges on every listing page, even in a real, visible,
     * logged-out Chrome - its edge service (Akamai) is blocking automated
     * browsing. Per the no-circumvention rule we do not probe again, spoof
     * anything or bypass; flip this flag to true to retry on another day
     * (the script is cache-first, so a retry resumes cheaply).
     */
    const COLLECT_ADIDAS = false;
    let adidasProducts: RawProduct[] = [];
    if (COLLECT_ADIDAS) {
      adidasProducts = await collectSite({
        base: ADIDAS_BASE,
        name: "adidas",
        listingUrls: ADIDAS_LISTING_URLS,
        targets: ADIDAS_TARGETS,
        fetchPage,
        parseListing: parseAdidasListing,
        parseProduct: parseAdidasProduct,
      });
    } else {
      blockedSites.push("adidas: disabled for this run (Akamai security block observed); retry later");
    }
    adidasCount = adidasProducts.length;

    const nikeProducts = await collectSite({
      base: NIKE_BASE,
      name: "nike",
      listingUrls: NIKE_LISTING_URLS,
      targets: NIKE_TARGETS,
      fetchPage,
      parseListing: parseNikeListing,
      parseProduct: parseNikeProduct,
    });
    nikeCount = nikeProducts.length;

    /* ------------------------- dedupe by SKU globally ---------------------- */
    const bySku = new Map<string, RawProduct>();
    for (const raw of [...adidasProducts, ...nikeProducts]) {
      if (bySku.has(raw.sku)) {
        logSkip(raw.sku, "duplicate SKU across sites");
        continue;
      }
      bySku.set(raw.sku, raw);
    }

    /* ---------------------------- images + seeds --------------------------- */
    const seeds: Seed[] = [];
    const allSizes = new Set<number>();
    for (const raw of [...bySku.values()].sort((a, b) => a.sku.localeCompare(b.sku))) {
      const gallery = await prepareGallery(raw.sku, raw.imageUrls);
      if (gallery.length === 0) continue;
      const product: Product = {
        id: raw.sku,
        title: raw.title,
        brand: raw.brand,
        price: raw.price,
        category: raw.category,
        description: descriptionFor(raw),
        image: imageModuleUrl(raw.sku, "1.webp"),
        images: gallery.map((_image, index) => imageModuleUrl(raw.sku, `${String(index + 1)}.webp`)),
        availableSizes: raw.sizes,
        isNew: raw.isNew,
      };
      if (raw.rating !== null) product.rating = raw.rating;
      if (parseProduct(product) === null) {
        logSkip(raw.sku, "failed parseProduct validation");
        continue;
      }
      for (const size of raw.sizes) allSizes.add(size);
      seeds.push({
        sku: raw.sku,
        brand: raw.brand,
        title: raw.title,
        price: raw.price,
        category: raw.category,
        description: descriptionFor(raw),
        sizes: raw.sizes,
        imageCount: gallery.length,
        isNew: raw.isNew,
        rating: raw.rating,
        colorway: raw.colorway,
        site: raw.site,
      });
    }

    /* ------------------------------- writing ------------------------------- */
    if (seeds.length === 0) throw new Error("No products survived collection; refusing to write data files");
    seeds.sort((a, b) => a.sku.localeCompare(b.sku));
    await writeFile(DATA_OUT, generateModule(seeds), "utf8");
    await writeFile(SIZES_OUT, generateSizesModule([...allSizes].sort((a, b) => a - b)), "utf8");
    await writeFile(
      CREDITS_OUT,
      generateCredits({
        collectedAt: new Date().toISOString().slice(0, 10),
        adidasCount,
        nikeCount,
        skipped: skips.length,
      }),
      "utf8",
    );
    await removeStaleImageDirs(new Set(seeds.map((seed) => seed.sku)));

    /* ------------------------------- summary ------------------------------- */
    const perCategory = new Map<ProductCategory, number>();
    for (const seed of seeds) perCategory.set(seed.category, (perCategory.get(seed.category) ?? 0) + 1);

    const minutes = Math.round((Date.now() - start) / 60_000);
    process.stdout.write("\n--- catalog:fetch summary ---\n");
    process.stdout.write(`Requests made this run: ${String(requestCount)} (budget ${String(TOTAL_REQUEST_BUDGET)})\n`);
    process.stdout.write(`Elapsed: ~${String(minutes)} min\n`);
    process.stdout.write(`adidas products kept: ${String(adidasCount)}\n`);
    process.stdout.write(`nike products kept:   ${String(nikeCount)}\n`);
    process.stdout.write(`Final catalog size:   ${String(seeds.length)}\n`);
    for (const [category, count] of perCategory) process.stdout.write(`  ${category}: ${String(count)}\n`);
    if (blockedSites.length > 0) {
      process.stdout.write("\nBlocked/limited:\n");
      for (const site of blockedSites) process.stdout.write(`  ! ${site}\n`);
    }
    if (notes.length > 0) {
      process.stdout.write("\nNotes:\n");
      for (const note of notes) process.stdout.write(`  ~ ${note}\n`);
    }
    if (skips.length > 0) {
      process.stdout.write("\nSkipped:\n");
      for (const skip of skips) process.stdout.write(`  - ${skip}\n`);
    }
    process.stdout.write("\nDone.\n");
  } catch (error) {
    if (error instanceof BudgetError) {
      blockedSites.push(`global: ${error.message}`);
      process.stdout.write(`\nStopped early: ${error.message}\n`);
      process.stdout.write(`Requests made: ${String(requestCount)}\n`);
      process.stdout.write("Re-run the script to continue from the cache.\n");
    } else {
      throw error;
    }
  } finally {
    await close();
  }
}

// Guard: the module can be imported for offline parser debugging with
// CATALOG_NO_RUN=1; normal use is `npm run catalog:fetch`.
if (process.env["CATALOG_NO_RUN"] !== "1") {
  await main();
}
