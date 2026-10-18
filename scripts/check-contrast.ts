/**
 * WCAG contrast audit for every text/background pairing the UI actually uses,
 * in both themes, plus the palette acceptance numbers (how far paper, surface
 * and chalk sit from pure white). Run with `npm run contrast:check`.
 *
 * The hex values mirror `src/index.css` (@theme + the dark overrides); keep
 * them in sync when the palette changes. `<alpha>` values are composited
 * over their background before measuring (page/75 over ink, etc).
 */

interface Pair {
  name: string;
  fg: string;
  bg: string;
  /** 4.5 for text, 3 for large text and UI components/indicators. */
  min: number;
}

function channel(component: number): number {
  const c = component / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const clean = hex.replace("#", "");
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(fg: string, bg: string): number {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [light, dark] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (light + 0.05) / (dark + 0.05);
}

/** Composites `fg` at `alpha` over `bg` (simple source-over). */
function blendOver(fg: string, bg: string, alpha: number): string {
  const parse = (hex: string): [number, number, number] => {
    const clean = hex.replace("#", "");
    return [
      Number.parseInt(clean.slice(0, 2), 16),
      Number.parseInt(clean.slice(2, 4), 16),
      Number.parseInt(clean.slice(4, 6), 16),
    ];
  };
  const [fr, fg2, fb] = parse(fg);
  const [br, bg2, bb] = parse(bg);
  const mix = (a: number, b: number): string =>
    Math.round(a * alpha + b * (1 - alpha))
      .toString(16)
      .padStart(2, "0");
  return `#${mix(fr, br)}${mix(fg2, bg2)}${mix(fb, bb)}`;
}

/* -------------------------------- palettes -------------------------------- */

const WHITE = "#ffffff";

// Light theme (@theme in src/index.css). A periwinkle-neutral family: the page
// and every raised surface sit a visible distance away from white, and the
// layering reads surface > paper > chalk > fog.
const L = {
  paper: "#d0d9f7",
  surface: "#e2e7fa",
  chalk: "#bac7ef",
  plate: "#bac7ef",
  fog: "#a3b1e0",
  line: "#4f5e8c",
  graphite: "#36415f",
  ink: "#0b1330",
  brand: "#2442e8",
  brandStrong: "#1b33c9",
  brandPressed: "#1426a8",
  accent: "#ff5c28",
  accentStrong: "#e8481a",
  accentInk: "#0b1330",
  onBrand: "#f4f6ff",
  danger: "#9e1c16",
};

// Dark theme (html[data-theme="dark"] overrides; brand fills unchanged). The
// light neutrals above never leak in: dark re-points paper/surface/chalk/fog/
// line/graphite/ink/danger, and plate keeps its own pale value on purpose.
const D = {
  paper: "#0a1026",
  surface: "#151d40",
  chalk: "#121a38",
  plate: "#e0e6f7",
  fog: "#2a3357",
  line: "#7c88b8",
  graphite: "#aeb6d4",
  ink: "#f2f4fc",
  brand: "#2442e8",
  brandStrong: "#1b33c9",
  brandPressed: "#1426a8",
  accent: "#ff5c28",
  accentStrong: "#e8481a",
  accentInk: "#0b1330",
  onBrand: "#f4f6ff",
  danger: "#ff6b61",
};

const TEXT = 4.5;
const UI = 3;

const pairs: Pair[] = [
  /* ------------------------------ acceptance ------------------------------- */
  // How far the light neutrals sit from pure white: the page and raised
  // surfaces must be measurably tinted, not just tinted on paper.
  { name: "ACCEPT paper vs white (min 1.35)", fg: L.paper, bg: WHITE, min: 1.35 },
  { name: "ACCEPT surface vs white (min 1.2)", fg: L.surface, bg: WHITE, min: 1.2 },
  { name: "ACCEPT chalk darker than paper (min 1.1)", fg: L.paper, bg: L.chalk, min: 1.1 },

  /* ------------------------------ light theme ------------------------------ */
  { name: "body text on page", fg: L.ink, bg: L.paper, min: TEXT },
  { name: "muted text on page", fg: L.graphite, bg: L.paper, min: TEXT },
  { name: "body text on raised surfaces", fg: L.ink, bg: L.surface, min: TEXT },
  { name: "muted text on raised surfaces", fg: L.graphite, bg: L.surface, min: TEXT },
  { name: "heading/text on frames", fg: L.ink, bg: L.chalk, min: TEXT },
  { name: "muted text on frames", fg: L.graphite, bg: L.chalk, min: TEXT },
  // Brand is a text colour on paper/surface only; on chalk (frames) it stays
  // below 4.5:1, so ink is used there instead.
  { name: "brand as text on page", fg: L.brand, bg: L.paper, min: TEXT },
  { name: "brand as text on raised surfaces", fg: L.brand, bg: L.surface, min: TEXT },
  { name: "accent panel text (on-brand on ink)", fg: L.onBrand, bg: L.ink, min: TEXT },
  {
    name: "muted accent-panel text (on-brand/75 on ink)",
    fg: blendOver(L.onBrand, L.ink, 0.75),
    bg: L.ink,
    min: TEXT,
  },
  { name: "primary button label", fg: L.onBrand, bg: L.brand, min: TEXT },
  { name: "primary button hover", fg: L.onBrand, bg: L.brandStrong, min: TEXT },
  { name: "primary button pressed", fg: L.onBrand, bg: L.brandPressed, min: TEXT },
  { name: "New badge label", fg: L.accentInk, bg: L.accent, min: TEXT },
  { name: "error text on page", fg: L.danger, bg: L.paper, min: TEXT },
  { name: "error text on raised surfaces", fg: L.danger, bg: L.surface, min: TEXT },
  { name: "error text on frames", fg: L.danger, bg: L.chalk, min: TEXT },
  { name: "control border vs page", fg: L.line, bg: L.paper, min: UI },
  { name: "control border vs raised surfaces", fg: L.line, bg: L.surface, min: UI },
  { name: "control border vs frames", fg: L.line, bg: L.chalk, min: UI },
  { name: "focus ring vs page", fg: L.brand, bg: L.paper, min: UI },
  { name: "focus ring vs raised surfaces", fg: L.brand, bg: L.surface, min: UI },
  { name: "focus ring vs frames", fg: L.brand, bg: L.chalk, min: UI },
  { name: "focus ring on accent panels", fg: L.onBrand, bg: L.ink, min: UI },
  // Link hover underlines use the ring highlight colour (brand in light).
  { name: "hover underline vs page", fg: L.brand, bg: L.paper, min: UI },
  { name: "hover underline vs raised surfaces", fg: L.brand, bg: L.surface, min: UI },
  { name: "hover underline vs frames", fg: L.brand, bg: L.chalk, min: UI },
  { name: "strength meter fill vs empty track", fg: L.brand, bg: L.chalk, min: UI },
  { name: "price slider thumb vs page", fg: L.brand, bg: L.paper, min: UI },
  { name: "shipping bar fill vs chalk panel", fg: L.brand, bg: L.chalk, min: UI },
  {
    // The bar itself is aria-hidden decoration; the "add X for free shipping"
    // sentence above it carries the state (WCAG 1.4.11 does not apply), so the
    // informational second row only has to stay visible against the ink rail.
    name: "shipping bar fill vs ink rail (decorative)",
    fg: L.brand,
    bg: L.ink,
    min: 1,
  },

  /* ------------------------------- dark theme ------------------------------ */
  { name: "dark: body text on page", fg: D.ink, bg: D.paper, min: TEXT },
  { name: "dark: muted text on page", fg: D.graphite, bg: D.paper, min: TEXT },
  { name: "dark: body text on raised surfaces", fg: D.ink, bg: D.surface, min: TEXT },
  { name: "dark: muted text on raised surfaces", fg: D.graphite, bg: D.surface, min: TEXT },
  { name: "dark: heading/text on frames", fg: D.ink, bg: D.chalk, min: TEXT },
  { name: "dark: muted text on frames", fg: D.graphite, bg: D.chalk, min: TEXT },
  { name: "dark: flipped panel text (paper on ink)", fg: D.paper, bg: D.ink, min: TEXT },
  {
    name: "dark: muted flipped panel text",
    fg: blendOver(D.paper, D.ink, 0.75),
    bg: D.ink,
    min: TEXT,
  },
  // The story band no longer flips bright in dark mode: it keeps a dark chalk
  // panel (see [data-story] in index.css), so its text pairs against chalk.
  { name: "dark: story band text (on-brand on chalk)", fg: D.onBrand, bg: D.chalk, min: TEXT },
  {
    name: "dark: muted story-band text (on-brand/75 on chalk)",
    fg: blendOver(D.onBrand, D.chalk, 0.75),
    bg: D.chalk,
    min: TEXT,
  },
  { name: "dark: primary button label", fg: D.onBrand, bg: D.brand, min: TEXT },
  { name: "dark: primary button hover", fg: D.onBrand, bg: D.brandStrong, min: TEXT },
  { name: "dark: New badge label", fg: D.accentInk, bg: D.accent, min: TEXT },
  { name: "dark: error text on page", fg: D.danger, bg: D.paper, min: TEXT },
  { name: "dark: error text on raised surfaces", fg: D.danger, bg: D.surface, min: TEXT },
  { name: "dark: error text on frames", fg: D.danger, bg: D.chalk, min: TEXT },
  { name: "dark: control border vs page", fg: D.line, bg: D.paper, min: UI },
  { name: "dark: control border vs raised surfaces", fg: D.line, bg: D.surface, min: UI },
  { name: "dark: control border vs frames", fg: D.line, bg: D.chalk, min: UI },
  { name: "dark: focus ring vs page", fg: D.ink, bg: D.paper, min: UI },
  { name: "dark: focus ring vs raised surfaces", fg: D.ink, bg: D.surface, min: UI },
  { name: "dark: focus ring vs frames", fg: D.ink, bg: D.chalk, min: UI },
  { name: "dark: focus ring on flipped panels", fg: D.paper, bg: D.ink, min: UI },
  { name: "dark: hover underline vs page", fg: D.ink, bg: D.paper, min: UI },
  { name: "dark: hover underline vs raised surfaces", fg: D.ink, bg: D.surface, min: UI },
  { name: "dark: hover underline vs frames", fg: D.ink, bg: D.chalk, min: UI },
  // In dark mode the rail flips to the light ink tint, so the brand fill has
  // a strong contrast against it (and the bar would pass 1.4.11 anyway).
  { name: "dark: shipping bar fill vs ink rail", fg: D.brand, bg: D.ink, min: UI },
];

/* --------------------------------- report --------------------------------- */

let failures = 0;

const rows = pairs.map((pair) => {
  const ratio = contrast(pair.fg, pair.bg);
  const ok = ratio >= pair.min;
  if (!ok) failures += 1;
  return {
    pairing: pair.name,
    fg: pair.fg,
    bg: pair.bg,
    ratio: `${ratio.toFixed(2)}:1`,
    required: `${pair.min}:1`,
    result: ok ? "PASS" : "FAIL",
  };
});

console.table(rows);

// The chalk/paper acceptance row above measures a ratio; laying (not just
// matching hue) also requires chalk to be the darker of the two.
const chalkDarker = luminance(L.chalk) < luminance(L.paper);
console.log(
  `chalk darker than paper: luminance chalk ${luminance(L.chalk).toFixed(4)} < paper ${luminance(L.paper).toFixed(4)} -> ${chalkDarker ? "OK" : "FAIL"}`,
);
if (!chalkDarker) failures += 1;

if (failures > 0) {
  console.error(`contrast:check FAILED: ${failures} pairing(s) below the required ratio.`);
  process.exit(1);
}
console.log(`contrast:check passed: all ${pairs.length} pairings meet the required ratio (AA).`);
