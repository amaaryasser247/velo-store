import type { RefObject } from "react";
import { gsap, SplitText, useGSAP } from "./gsap";
import { DUR, STAGGER } from "./motion";

type HeadingRevealOptions = {
  /** Heading to split inside the scope; defaults to the first "h2". */
  selector?: string;
  /** ScrollTrigger start; the reveal fires once when the heading passes it. */
  start?: string;
  stagger?: number;
};

/**
 * Word-by-word heading reveal for section titles ("New arrivals", "Shop by
 * sport", ...). The reveal runs once at "top 85%" and the split is reverted
 * afterwards so the DOM goes back to a single text node. Reduced motion skips
 * the split entirely: the heading stays plain, always-visible text.
 */
export function useHeadingReveal(
  scope: RefObject<HTMLElement | null>,
  { selector = "h2", start = "top 85%", stagger = STAGGER.tight }: HeadingRevealOptions = {},
): void {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const heading = root.querySelector<HTMLElement>(selector);
        if (!heading) return;
        const split = SplitText.create(heading, { type: "words", aria: "auto" });
        let reverted = false;
        const revert = (): void => {
          if (reverted) return;
          reverted = true;
          split.revert();
        };
        gsap.fromTo(
          split.words,
          { yPercent: 60, autoAlpha: 0 },
          {
            yPercent: 0,
            autoAlpha: 1,
            duration: DUR.reveal,
            stagger,
            scrollTrigger: { trigger: heading, start, once: true },
            onComplete: revert,
          },
        );
        return revert;
      });
      return () => mm.revert();
    },
    { scope },
  );
}
