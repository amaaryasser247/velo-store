import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { ProductCategory } from "../../types/product";
import { products } from "../../data/products";
import { gsap, useGSAP } from "../../lib/gsap";
import { EASE, STAGGER } from "../../lib/motion";
import { useHeadingReveal } from "../../lib/reveal";
import Container from "../common/Container";

const CATEGORIES: readonly ProductCategory[] = [
  "running",
  "basketball",
  "lifestyle",
  "training",
  "skate",
];

const BLURB_KEYS = {
  running: "collections.runningBlurb",
  basketball: "collections.basketballBlurb",
  lifestyle: "collections.lifestyleBlurb",
  training: "collections.trainingBlurb",
  skate: "collections.skateBlurb",
} as const satisfies Record<ProductCategory, string>;

/**
 * Tiles are driven by the real catalog: the first product the collection
 * brought back for a category supplies the photo. Nothing here is hard-coded;
 * categories the sources did not cover simply fall back to no photo.
 */
export default function FeaturedCollections() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  useHeadingReveal(sectionRef);

  const tiles = CATEGORIES.map((category) => {
    const first = products.find((product) => product.category === category);
    return { category, image: first?.image ?? null };
  });

  // Tiles wipe open with a clip-path reveal while the photo eases from a
  // slight zoom down to its natural scale. The wipe is vertical, so it reads
  // the same in both directions.
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const list = section.querySelector<HTMLElement>("[data-tiles]");
        const tileEls = gsap.utils.toArray<HTMLElement>("[data-tile]", section);
        const frames = gsap.utils.toArray<HTMLElement>("[data-tile-image]", section);
        if (list && tileEls.length > 0) {
          gsap.fromTo(
            tileEls,
            { clipPath: "inset(0% 0% 100% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 0.8,
              ease: EASE.out,
              stagger: STAGGER.base,
              scrollTrigger: { trigger: list, start: "top 82%", once: true },
            },
          );
        }
        if (list && frames.length > 0) {
          gsap.fromTo(
            frames,
            { scale: 1.08 },
            {
              scale: 1,
              duration: 1,
              ease: EASE.out,
              stagger: STAGGER.base,
              scrollTrigger: { trigger: list, start: "top 82%", once: true },
            },
          );
        }
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} aria-labelledby="collections-title" className="py-16 sm:py-24">
      <Container>
        <h2 id="collections-title" className="type-display type-heading text-center">
          {t("collections.title")}
        </h2>

        <ul data-tiles className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          {tiles.map((tile, index) => (
            <li
              key={tile.category}
              data-tile
              className={index === tiles.length - 1 ? "col-span-2 md:col-span-1" : ""}
            >
              <Link
                to={`/shop?category=${tile.category}`}
                className={`group relative block overflow-hidden border border-fog bg-plate ${
                  index === tiles.length - 1 ? "aspect-[2/1] md:aspect-[4/5]" : "aspect-[4/5]"
                }`}
              >
                {tile.image ? (
                  <span data-tile-image className="absolute inset-0 block">
                    <img
                      src={tile.image}
                      alt={""}
                      loading="lazy"
                      className="h-full w-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105"
                    />
                  </span>
                ) : null}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-chalk from-55% via-chalk/85 to-transparent p-4 pt-12">
                  <h3 className="type-title text-2xl">{t(`collections.${tile.category}`)}</h3>
                  <p className="mt-1 text-sm text-graphite">{t(BLURB_KEYS[tile.category])}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
