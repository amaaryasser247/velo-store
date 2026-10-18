import { useId, useRef } from "react";
import type { Product } from "../../types/product";
import { useHeadingReveal } from "../../lib/reveal";
import { ButtonLink } from "../common/Button";
import Container from "../common/Container";
import ProductGrid from "../products/ProductGrid";

type ProductSectionProps = {
  title: string;
  products: readonly Product[];
  description?: string;
  linkTo?: string;
  linkLabel?: string;
};

export default function ProductSection({
  title,
  products,
  description,
  linkTo,
  linkLabel,
}: ProductSectionProps) {
  const headingId = useId();
  const sectionRef = useRef<HTMLElement>(null);
  useHeadingReveal(sectionRef);

  if (products.length === 0) return null;

  return (
    <section ref={sectionRef} aria-labelledby={headingId} className="py-12 sm:py-16">
      <Container>
        <div className="mb-10 text-center sm:mb-12">
          <h2 id={headingId} className="type-display type-heading">
            {title}
          </h2>
          {description ? (
            <p className="mx-auto mt-4 max-w-xl text-graphite">{description}</p>
          ) : null}
          {linkTo && linkLabel ? (
            <ButtonLink to={linkTo} variant="secondary" className="mt-5">
              {linkLabel}
            </ButtonLink>
          ) : null}
        </div>
        <ProductGrid products={products} />
      </Container>
    </section>
  );
}
