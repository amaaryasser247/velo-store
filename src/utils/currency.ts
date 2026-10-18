export function roundCurrency(amount: number): number {
  return Math.round(amount * 100) / 100;
}

/**
 * Sizes use a single store-wide system (EU). EU half sizes print as decimals;
 * the "thirds" runs shown on some source pages (40 2/3) come back from the
 * canonical 4-decimal numbers the catalog stores (40.6667).
 *
 * Size numbers stay in Western digits in both languages, matching the SKUs.
 */
export function formatSize(size: number): string {
  const floor = Math.floor(size);
  const fraction = size - floor;
  if (Math.abs(fraction - 1 / 3) < 1e-3) return `${floor} 1/3`;
  if (Math.abs(fraction - 2 / 3) < 1e-3) return `${floor} 2/3`;
  return String(size);
}
