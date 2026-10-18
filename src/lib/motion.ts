/**
 * The VELO motion language. Every duration, ease, stagger and travel distance
 * used across the site comes from here, so the whole store moves with one
 * voice: restrained, mostly power3/expo ease-out, reveals 0.6-0.9s.
 */

export const EASE = {
  /** Default reveal curve. */
  out: "power3.out",
  /** Hero intro and long landings: pronounced deceleration. */
  intro: "expo.out",
  /** Symmetric curve for panels and collapses. */
  inOut: "power2.inOut",
  /** Micro-interactions: quick and snappy. */
  micro: "power2.out",
  /** Overshoot, reserved for the wishlist heart. */
  pop: "elastic.out(1, 0.45)",
} as const;

export const DUR = {
  micro: 0.2,
  quick: 0.35,
  reveal: 0.7,
  /** Cart line height collapse (the one allowed height animation). */
  collapse: 0.24,
  pulse: 0.35,
} as const;

export const STAGGER = {
  tight: 0.05,
  base: 0.08,
  loose: 0.12,
  chars: 0.075,
  words: 0.035,
} as const;

export const DIST = {
  /** Generic rise distances for reveals. */
  rise: 24,
  riseSmall: 12,
  riseTiny: 8,
  /** Scroll-scrubbed hero exit: the photo is viewport-fixed, so the type
   * drifts down over it as the page rises - the wordmark lags most, then the
   * tagline, then the buttons. The scrub plays in both scroll directions. */
  scrubWordmark: 52,
  scrubWordmarkMobile: 30,
  scrubTagline: 36,
  scrubTaglineMobile: 22,
  scrubActions: 24,
  scrubActionsMobile: 14,
} as const;
