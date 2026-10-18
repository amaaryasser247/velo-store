import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useHeadingReveal } from "../../lib/reveal";
import Container from "../common/Container";

/**
 * The about section: what the shop is and the idea behind it. It sits in the
 * single-page home flow (directly after the hero); /about and every About
 * link land here instead of a separate page. The title runs at hero scale and
 * the copy sits underneath it.
 */
export default function AboutSection() {
  const { t } = useTranslation();
  const sectionRef = useRef<HTMLElement>(null);
  useHeadingReveal(sectionRef);

  return (
    <section
      ref={sectionRef}
      id="about"
      aria-labelledby="about-heading"
      className="scroll-mt-20 py-12 sm:py-16"
    >
      <Container>
        <h2 id="about-heading" className="type-display type-heading text-center">
          {t("about.title")}
        </h2>
        <div className="mx-auto mt-8 max-w-2xl space-y-5 text-center sm:mt-12">
          <p className="type-title text-2xl sm:text-3xl">{t("about.lead")}</p>
          <p className="text-lg leading-relaxed text-graphite">{t("about.p1")}</p>
          <p className="text-lg leading-relaxed text-graphite">{t("about.p2")}</p>
        </div>
      </Container>
    </section>
  );
}
