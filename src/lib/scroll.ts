import { prefersReducedMotion } from "./gsap";

/**
 * Scrolls the page to an element by id. About lives in the one-page home flow
 * (see AboutLink), and the mobile menu locks body scroll while it closes, so
 * an immediate scroll would be swallowed: this waits for the lock to lift
 * first, with a short deadline as a fallback.
 */
export function scrollToSection(id: string): void {
  const deadline = performance.now() + 1500;
  const attempt = (): void => {
    if (document.body.style.overflow === "hidden" && performance.now() < deadline) {
      requestAnimationFrame(attempt);
      return;
    }
    document.getElementById(id)?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "start",
    });
  };
  attempt();
}
