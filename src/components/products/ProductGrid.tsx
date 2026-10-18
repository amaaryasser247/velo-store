import { useRef } from "react";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import { gsap, inViewport, ScrollTrigger, useGSAP } from "../../lib/gsap";
import { DIST, DUR, EASE, STAGGER } from "../../lib/motion";
import type { Product } from "../../types/product";
import ProductCard from "./ProductCard";

type ProductGridProps = {
  products: readonly Product[];
};

export default function ProductGrid({ products }: ProductGridProps) {
  const { addItem } = useCart();
  const { isWishlisted, toggleItem } = useWishlist();
  const gridRef = useRef<HTMLUListElement>(null);
  const revealed = useRef(new WeakSet<Element>());
  const firstRun = useRef(true);

  useGSAP(
    () => {
      const grid = gridRef.current;
      if (!grid) return;
      const items = gsap.utils.toArray<HTMLElement>("[data-grid-item]", grid);
      const isFirst = firstRun.current;
      firstRun.current = false;

      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Fresh below-the-fold cards start hidden (GSAP-set, never CSS) and
        // are revealed in a batched stagger as they scroll in.
        const fresh = items.filter((item) => !revealed.current.has(item));
        for (const item of fresh) {
          if (!inViewport(item)) gsap.set(item, { autoAlpha: 0, y: DIST.rise });
        }
        if (fresh.length > 0) {
          ScrollTrigger.batch(fresh, {
            start: "top 88%",
            once: true,
            onEnter: (batch) => {
              batch.forEach((el) => revealed.current.add(el));
              gsap.fromTo(
                batch,
                { autoAlpha: 0, y: DIST.rise },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: DUR.reveal,
                  ease: EASE.out,
                  stagger: STAGGER.base,
                  overwrite: true,
                },
              );
            },
          });
        }
        // Filter or sort changes: the results already on screen get a short
        // fade and rise instead of a hard swap.
        if (!isFirst) {
          const onScreen = items.filter((item) => revealed.current.has(item) && inViewport(item));
          if (onScreen.length > 0) {
            gsap.fromTo(
              onScreen,
              { autoAlpha: 0.35, y: DIST.riseSmall },
              {
                autoAlpha: 1,
                y: 0,
                duration: DUR.quick,
                ease: EASE.out,
                stagger: STAGGER.tight,
                overwrite: true,
              },
            );
          }
        }
      });
      return () => mm.revert();
    },
    { scope: gridRef, dependencies: [products], revertOnUpdate: true },
  );

  return (
    <ul
      ref={gridRef}
      className="grid grid-cols-2 gap-x-3 gap-y-10 sm:gap-x-4 md:grid-cols-3 xl:grid-cols-4"
    >
      {products.map((product) => (
        <li key={product.id} data-grid-item>
          <ProductCard
            product={product}
            onAddToCart={(item, size) => addItem(item, size)}
            isWishlisted={isWishlisted(product.id)}
            onToggleWishlist={toggleItem}
          />
        </li>
      ))}
    </ul>
  );
}
