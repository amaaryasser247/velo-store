import { useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import Container from "../common/Container";
import { FREE_SHIPPING_THRESHOLD } from "../../utils/cart";
import { useFormat } from "../../i18n/format";
import { gsap, SplitText, useGSAP } from "../../lib/gsap";
import { DUR, EASE, STAGGER } from "../../lib/motion";

export default function BrandStory() {
  const { t } = useTranslation();
  const { price } = useFormat();
  const sectionRef = useRef<HTMLElement>(null);

  const facts = useMemo(() => {
    const amount = price(FREE_SHIPPING_THRESHOLD);
    return [
      { title: t("story.fitsTitle"), text: t("story.fitsText") },
      { title: t("story.returnsTitle"), text: t("story.returnsText") },
      { title: t("story.shippingTitle", { amount }), text: t("story.shippingText", { amount }) },
    ];
  }, [t, price]);

  // The statement reveals word by word on a scroll-scrubbed opacity ramp
  // (reverses cleanly on the way back up), then the three facts stagger in.
  // Word-level splitting only - never individual Arabic characters.
  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const statement = section.querySelector<HTMLElement>("#story-title");
        let statementSplit: SplitText | null = null;
        if (statement) {
          statementSplit = SplitText.create(statement, { type: "words", aria: "auto" });
          gsap.fromTo(
            statementSplit.words,
            { opacity: 0.15 },
            {
              opacity: 1,
              stagger: 0.4,
              ease: "none",
              scrollTrigger: {
                trigger: statement,
                start: "top 75%",
                end: "center 45%",
                scrub: 0.5,
                invalidateOnRefresh: true,
              },
            },
          );
        }
        const factEls = gsap.utils.toArray<HTMLElement>("[data-fact]", section);
        if (factEls.length > 0) {
          gsap.fromTo(
            factEls,
            { y: 20, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: DUR.reveal,
              ease: EASE.out,
              stagger: STAGGER.base,
              scrollTrigger: { trigger: factEls[0] ?? section, start: "top 88%", once: true },
            },
          );
        }
        return () => {
          statementSplit?.revert();
        };
      });
      return () => mm.revert();
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      aria-labelledby="story-title"
      data-story
      className="bg-ink text-on-brand"
    >
      <Container className="py-20 sm:py-28">
        <h2
          id="story-title"
          className="type-display max-w-5xl text-[clamp(2.5rem,7vw,6rem)]"
        >
          {t("story.statement")}
        </h2>

        <dl className="mt-16 grid gap-10 md:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.title} data-fact className="border-t border-on-brand/30 pt-5">
              <dt className="type-title text-xl">{fact.title}</dt>
              <dd className="mt-2 max-w-xs text-on-brand/75">{fact.text}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
