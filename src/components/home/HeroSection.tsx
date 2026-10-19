import { useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { products } from "../../data/products";
import { useFormat } from "../../i18n/format";
import { fontsReady, gsap, SplitText, useGSAP } from "../../lib/gsap";
import { DIST, EASE, STAGGER } from "../../lib/motion";
import { ButtonLink } from "../common/Button";
import Container from "../common/Container";

/**
 * Set once the full intro has completed during this page load. A later
 * client-side return to Home plays a short version instead. Module scope on
 * purpose (a full reload resets it), and only set on completion so the
 * StrictMode double-mount in dev still plays the full intro.
 */
let fullIntroPlayed = false;

/**
 * Full-bleed hero photo (the Nike campaign still, cropped and encoded by
 * `npm run hero:build`). Below 768px the <picture> switches to a dedicated
 * portrait crop of the middle of the frame, so the head, the bucket hat and
 * a shoe stay in view.
 */
const HERO_BASE = `${import.meta.env.BASE_URL}images/hero/`;
const FULL_WIDTHS = [640, 960, 1440, 1793];
const MOBILE_WIDTHS = [640, 717];

function heroSrcSet(prefix: string, widths: number[], ext: string): string {
  return widths.map((width) => `${HERO_BASE}${prefix}-${width}.${ext} ${width}w`).join(", ");
}

function sourceBrands(): string[] {
  return [...new Set(products.map((product) => product.brand))];
}

export default function HeroSection() {
  const { t, i18n } = useTranslation();
  const { list, tPlural } = useFormat();
  const catalogSize = products.length;
  const isAr = (i18n.resolvedLanguage ?? "en").startsWith("ar");
  const sectionRef = useRef<HTMLElement>(null);
  const wordmarkRef = useRef<HTMLSpanElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLImageElement>(null);
  const didRunRef = useRef(false);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const bg = bgRef.current;
      const wordmark = wordmarkRef.current;
      const tagline = taglineRef.current;
      const actions = actionsRef.current;
      if (!section || !wordmark || !tagline || !actions) return;

      const isShort = fullIntroPlayed;
      // True when this is the language-switch re-run rather than a fresh
      // mount: the photo then stays put (no route transition to cover) and
      // only the type plays the reprise.
      const isReRun = didRunRef.current;
      didRunRef.current = true;
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", (context) => {
        const buttonEls = Array.from(actions.children);

        let cancelled = false;
        let wordmarkSplit: SplitText | null = null;

        // The tagline is split into words up front; they stay hidden (GSAP-set,
        // never CSS) until their slot in the timeline. Word-level splitting
        // only - Arabic is never taken apart into individual characters.
        const taglineSplit = SplitText.create(tagline, { type: "words", aria: "auto" });
        gsap.set(taglineSplit.words, { y: DIST.riseSmall, autoAlpha: 0 });

        /**
         * Scroll-linked hero exit, created once the intro has landed and
         * scrubbed in BOTH scroll directions. The photo is pinned to the
         * viewport (see the backdrop shell), so the type drifts over the
         * still photo as the page rises: the wordmark lags most, the
         * tagline a little less, the buttons least.
         */
        function createScrub(): void {
          const scrubY = (desktop: number, mobile: number): (() => number) => () =>
            window.innerWidth < 640 ? mobile : desktop;
          const exitTl = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top top",
              end: "bottom top",
              scrub: 0.4,
              invalidateOnRefresh: true,
            },
          });
          exitTl.to(wordmark, { y: scrubY(DIST.scrubWordmark, DIST.scrubWordmarkMobile), ease: "none" }, 0);
          exitTl.to(tagline, { y: scrubY(DIST.scrubTagline, DIST.scrubTaglineMobile), ease: "none" }, 0);
          exitTl.to(actions, { y: scrubY(DIST.scrubActions, DIST.scrubActionsMobile), ease: "none" }, 0);
        }

        const tl = gsap.timeline({
          defaults: { ease: EASE.out },
          onComplete: () => {
            if (cancelled) return;
            if (!isShort) fullIntroPlayed = true;
            context.add(createScrub);
          },
        });

        if (isShort) {
          // <= 0.5s reprise for client-side navigation back to Home.
          gsap.set(wordmark, { y: DIST.riseSmall, autoAlpha: 0 });
          gsap.set(buttonEls, { y: DIST.riseSmall, autoAlpha: 0 });
          // The backdrop waits out Layout's 350ms route transition so the
          // photo never appears before the page itself has settled. A
          // language re-run has no transition, so the photo stays put.
          if (bg && !isReRun) {
            gsap.set(bg, { autoAlpha: 0 });
            tl.to(bg, { autoAlpha: 1, duration: 0.28 }, 0.4);
          }
          tl.to(
            wordmark,
            { y: 0, autoAlpha: 1, duration: 0.35, clearProps: "opacity,visibility,transform" },
            0.05,
          );
          tl.to(
            taglineSplit.words,
            { y: 0, autoAlpha: 1, duration: 0.35, stagger: STAGGER.words, clearProps: "opacity,visibility,transform" },
            0.05,
          );
          tl.to(
            buttonEls,
            { y: 0, autoAlpha: 1, duration: 0.35, stagger: STAGGER.tight, clearProps: "opacity,visibility,transform" },
            0.12,
          );
        } else {
          gsap.set(buttonEls, { y: DIST.riseSmall, autoAlpha: 0 });

          // The backdrop photo fades in and settles from a slight overscale.
          // The fade waits out Layout's 350ms route transition just like the
          // short reprise; the settle starts immediately (still hidden), is
          // transform-only and cannot shift layout, and the fade stays well
          // under 300ms for the LCP element.
          if (bg) {
            gsap.set(bg, { autoAlpha: 0, scale: 1.06 });
            tl.to(bg, { autoAlpha: 1, duration: 0.28 }, 0.4);
            tl.to(bg, { scale: 1, duration: 1.4 }, 0);
          }

          // The word cascade is compressed to fit the 1.8s budget no matter
          // how long the (dynamic) tagline sentence is.
          const taglineWords = taglineSplit.words.length;
          const taglineStagger =
            taglineWords > 1 ? Math.min(STAGGER.words, Math.max(0.006, 0.29 / (taglineWords - 1))) : 0;
          tl.to(taglineSplit.words, { y: 0, autoAlpha: 1, duration: 0.4, stagger: taglineStagger }, 1.06);
          tl.to(buttonEls, { y: 0, autoAlpha: 1, duration: 0.4, stagger: STAGGER.base }, 1.3);

          // Wordmark: the piece slides up out of a mask, split only once the
          // variable font is ready (with a 1s timeout fallback). English
          // keeps the Latin VELO (character split keeps the approved look);
          // Arabic is real Arabic text (فيلو) and is never taken apart into
          // characters - the whole word rides up as one unit instead.
          void fontsReady().then(() => {
            if (cancelled) return;
            let revealed = false;
            wordmarkSplit = SplitText.create(wordmark, {
              type: isAr ? "words" : "chars",
              mask: isAr ? "words" : "chars",
              autoSplit: true,
              onSplit: (self) => {
                // A hair of breathing room so glyph edges are never clipped
                // by the mask (layout-neutral: padding offset by margins).
                // Cairo's Arabic glyphs sit taller, so the word gets more.
                const padX = isAr ? "0.08em" : "0.06em";
                const padY = isAr ? "0.16em" : "0.08em";
                for (const mask of self.masks) {
                  const maskEl = mask as HTMLElement;
                  maskEl.style.padding = `${padY} ${padX}`;
                  maskEl.style.margin = `-${padY} -${padX}`;
                }
                const pieces = isAr ? self.words : self.chars;
                if (revealed) {
                  gsap.set(pieces, { yPercent: 0 });
                  return;
                }
                revealed = true;
                // 150% for the taller Arabic word keeps it fully hidden under
                // the mask (whose window is taller too) before the reveal.
                gsap.set(pieces, { yPercent: isAr ? 150 : 130 });
                const reveal = gsap.to(pieces, {
                  yPercent: 0,
                  duration: 0.75,
                  ease: EASE.out,
                  stagger: STAGGER.chars,
                });
                // Normal case: the wordmark slot in the master timeline. If a
                // slow font pushed us past it, arrive mid-reveal instead - the
                // cap keeps the master timeline inside its 1.8s budget.
                if (tl.isActive()) tl.add(reveal, Math.min(Math.max(0.3, tl.time()), 0.8));
                else reveal.play();
              },
            });
          });
        }

        return () => {
          cancelled = true;
          taglineSplit.revert();
          wordmarkSplit?.revert();
        };
      });

      return () => mm.revert();
    },
    {
      scope: sectionRef,
      // A live language switch swaps the wordmark's script (and therefore
      // its split): revert and rebuild the whole hero timeline in place.
      dependencies: [i18n.resolvedLanguage],
      revertOnUpdate: true,
    },
  );

  // The backdrop markup travels through a portal into the first slot in
  // <body> (index.html) so its sticky box starts at the very top of the page
  // - not below the navbar - whatever the chrome above <main> measures. The
  // app is pulled back up by the shell's height in index.css, so the page's
  // flow, its height and every scroll position stay exactly as they were.
  const backdropSlot = document.getElementById("hero-backdrop-slot");
  const backdrop = (
    <div
      data-hero-backdrop
      aria-hidden="true"
      className="pointer-events-none sticky top-0 -z-10 h-screen overflow-hidden"
    >
      <picture className="block h-full w-full">
        <source media="(max-width: 767px)" type="image/avif" srcSet={heroSrcSet("hero-mobile", MOBILE_WIDTHS, "avif")} sizes="100vw" />
        <source media="(max-width: 767px)" type="image/webp" srcSet={heroSrcSet("hero-mobile", MOBILE_WIDTHS, "webp")} sizes="100vw" />
        <source media="(max-width: 767px)" type="image/jpeg" srcSet={heroSrcSet("hero-mobile", MOBILE_WIDTHS, "jpg")} sizes="100vw" />
        <source type="image/avif" srcSet={heroSrcSet("hero", FULL_WIDTHS, "avif")} sizes="100vw" />
        <source type="image/webp" srcSet={heroSrcSet("hero", FULL_WIDTHS, "webp")} sizes="100vw" />
        <img
          ref={bgRef}
          src={`${HERO_BASE}hero-1440.jpg`}
          srcSet={heroSrcSet("hero", FULL_WIDTHS, "jpg")}
          sizes="100vw"
          alt=""
          aria-hidden="true"
          decoding="async"
          fetchPriority="high"
          className="h-full w-full object-cover"
        />
      </picture>
    </div>
  );

  return (
    <>
      {/* Full-bleed backdrop: the page scrolls over a still photo.

          Sticky and flow-sized, not `position: fixed`: Firefox can reserve
          a classic, space-taking scrollbar (~24px on Android with "always
          show scrollbars"; it sits right in English, left in Arabic) while
          fixed layers still span the whole window - the un-scrimmed photo
          then pokes out as a bright lane beside the navbar and every paper
          plate. A sticky box ends exactly at the content edge in every
          engine and scrollbar mode, and the flow width also keeps it
          stable when the mobile browser toolbar slides away.

          Height is 100vh (the large viewport, never the dynamic one): a
          stretched cover photo re-crops on every toolbar move, which reads
          as a random zoom; 100vh never budges through them. z -10 keeps
          the shell behind every paper plate and the footer, so the
          sections below the hero cover it as they arrive. Decorative
          (alt="") - the h1 carries the meaning - and never lazy: the
          photo is the LCP element. */}
      {backdropSlot ? createPortal(backdrop, backdropSlot) : null}

      <section ref={sectionRef} data-hero aria-labelledby="hero-title" className="relative overflow-hidden">
        {/* Ink veil between the busy photo and the content (see hero-scrim).
            It stays section-anchored - not viewport-fixed - so the gradient
            always spans exactly the box the text sits in. */}
        <div aria-hidden="true" className="hero-scrim absolute inset-0" />

        <Container className="relative pt-4 sm:pt-8">
          <h1
            id="hero-title"
            lang={isAr ? "ar" : "en"}
            className="type-display -ms-[0.04em] select-none text-[clamp(3rem,26vw,24rem)] text-on-brand"
          >
            {/* The wordmark in the page's own script: VELO as a Latin island
                in English, فيلو as real Arabic in Arabic (the split below
                stays word-level). Keyed per language so a live switch
                remounts it cleanly out of SplitText's markup. */}
            <span
              key={isAr ? "ar" : "en"}
              ref={wordmarkRef}
              aria-hidden={isAr ? undefined : true}
              lang={isAr ? "ar" : "en"}
              dir={isAr ? undefined : "ltr"}
              className="hero-wordmark inline-block whitespace-nowrap"
            >
              {isAr ? "فيلو" : "VELO"}
            </span>
            <span className="sr-only" lang={i18n.resolvedLanguage ?? "en"}>
              {t("hero.srName")}
            </span>
          </h1>

          {/* Tagline on one side, actions on the other from md up (stacked on
              phones); the buttons push to the inline end, so the split
              mirrors with the language. The row keeps the old shoe-plate
              height from md up (347.5px = the removed 34rem 8:5 figure), so
              nothing below the hero moves. */}
          <div className="flex flex-col pb-14 pt-6 md:min-h-[347.5px] md:flex-row md:items-center">
            {/* Keyed per language, like the wordmark: SplitText rewrites the
                paragraph's children, so without a fresh node a live switch
                leaves the OLD sentence behind - the split's revert restores
                the text it captured, clobbering React's update (which also
                rendered the English sentence right-to-left under RTL). */}
            <p
              key={i18n.resolvedLanguage ?? "en"}
              ref={taglineRef}
              className="text-on-brand text-lg leading-snug sm:text-xl md:max-w-[30rem]"
            >
              {catalogSize > 0
                ? tPlural("hero.pairs", catalogSize, { sources: list(sourceBrands()) })
                : t("hero.fallbackTagline")}
            </p>
            <div ref={actionsRef} className="mt-6 flex flex-wrap gap-3 md:mt-0 md:ms-auto">
              <ButtonLink to="/shop" size="lg" className="w-full sm:w-auto">
                {t("hero.shopAll")}
              </ButtonLink>
              <ButtonLink to="/shop?new=1" variant="inverse" size="lg" className="w-full sm:w-auto">
                {t("hero.newArrivals")}
              </ButtonLink>
            </div>

            {/* Invisible layout box standing in for the removed shoe panel:
                the same 8/5 plate geometry (full width below md) keeps the
                phone hero's height exactly where it was. Nothing paints
                here; from md up the row's min-height carries the geometry. */}
            <div aria-hidden="true" className="mt-8 border-2 border-transparent p-2 md:hidden">
              <div className="aspect-[8/5]" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
