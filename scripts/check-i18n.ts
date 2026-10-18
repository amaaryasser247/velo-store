/**
 * i18n hygiene check, run with `npm run i18n:check`:
 *
 * 1. The `en` and `ar` key sets must be identical (belt and braces - the
 *    TypeScript dictionary types already enforce this at compile time).
 * 2. No value may be empty.
 * 3. An Arabic value must not be identical to its English counterpart,
 *    except for the allowlist below (brand name, language endonyms -
 *    strings that are intentionally shared).
 */
import ar from "../src/i18n/ar.ts";
import en from "../src/i18n/en.ts";

const ALLOWLIST = new Set<string>([
  // Exactly-equal values are fine for these keys: they are not prose.
  "meta.base", // contains "VELO"
  "footer.companyHeading",
  "language.arabic", // endonym, deliberately in Arabic in both files
  "language.english", // endonym, deliberately in English in both files
]);

type FlatMap = Map<string, string>;

function flatten(value: unknown, prefix: string, out: FlatMap): void {
  if (typeof value === "string") {
    out.set(prefix, value);
    return;
  }
  if (value !== null && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix === "" ? key : `${prefix}.${key}`, out);
    }
    return;
  }
  throw new Error(`Unexpected resource value at "${prefix}": ${typeof value}`);
}

const enFlat: FlatMap = new Map();
const arFlat: FlatMap = new Map();
flatten(en, "", enFlat);
flatten(ar, "", arFlat);

let failures = 0;

function fail(message: string): void {
  failures += 1;
  console.error(`  x ${message}`);
}

console.log(`i18n:check - ${enFlat.size} keys per locale`);

// 1. Key sets
for (const key of enFlat.keys()) {
  if (!arFlat.has(key)) fail(`missing in ar: ${key}`);
}
for (const key of arFlat.keys()) {
  if (!enFlat.has(key)) fail(`missing in en: ${key}`);
}

// 2. Empty values
for (const [key, value] of [...enFlat, ...arFlat]) {
  if (value.trim() === "") fail(`empty value: ${key}`);
}

// 3. Identical strings
for (const [key, enValue] of enFlat) {
  const arValue = arFlat.get(key);
  if (arValue === undefined) continue;
  if (arValue === enValue && !ALLOWLIST.has(key)) {
    fail(`ar equals en (not allowlisted): ${key} -> "${enValue}"`);
  }
}

if (failures > 0) {
  console.error(`i18n:check FAILED with ${failures} problem(s).`);
  process.exit(1);
}
console.log("i18n:check passed: key sets match, no empty values, no untranslated duplicates.");
