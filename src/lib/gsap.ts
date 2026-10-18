import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { EASE } from "./motion";

/** Single registration point for the whole app. */
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

gsap.defaults({ ease: EASE.out, duration: 0.7 });

/** True when the visitor has asked the OS for reduced motion. */
export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Resolves once the variable font is ready, giving up after `timeoutMs` so a
 * slow or failed font load can never hold an intro hostage. The hero waits on
 * this before splitting its wordmark.
 */
export async function fontsReady(timeoutMs = 1000): Promise<void> {
  const fallback = new Promise<void>((resolve) => {
    window.setTimeout(resolve, timeoutMs);
  });
  await Promise.race([document.fonts.ready.then(() => undefined), fallback]);
}

/** Whether any part of `el` is inside the viewport right now. */
export function inViewport(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (
    rect.bottom > 0 &&
    rect.top < window.innerHeight &&
    rect.right > 0 &&
    rect.left < window.innerWidth
  );
}

if (import.meta.env.DEV) {
  // Dev-only handle used by the live verification scripts; stripped from builds.
  (window as unknown as Record<string, unknown>).__velo = { gsap, ScrollTrigger, SplitText };
}

export { gsap, ScrollTrigger, SplitText, useGSAP };
