import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { PRODUCT_CATEGORIES } from "../../types/product";
import { gsap, useGSAP } from "../../lib/gsap";
import { DUR, STAGGER } from "../../lib/motion";
import Container from "../common/Container";
import AboutLink from "./AboutLink";

const linkClass = "underline-offset-4 decoration-ring decoration-2 hover:underline";

export default function Footer() {
  const { t } = useTranslation();
  const footerRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const footer = footerRef.current;
      if (!footer) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const blocks = gsap.utils.toArray<HTMLElement>("[data-footer-block]", footer);
        gsap.fromTo(
          blocks,
          { y: 18, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: DUR.reveal,
            stagger: STAGGER.base,
            scrollTrigger: { trigger: footer, start: "top 92%", once: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: footerRef },
  );

  return (
    <footer ref={footerRef} className="border-t border-fog">
      <Container className="grid gap-12 py-14 md:grid-cols-[1.5fr_1fr_1fr]">
        <div data-footer-block>
          <p className="type-display text-5xl" lang="en">
            VELO
          </p>
          <p className="mt-4 max-w-xs text-sm text-graphite">{t("footer.about")}</p>
        </div>

        <nav data-footer-block aria-label={t("footer.shopByCategory")}>
          <h2 className="type-title text-base">{t("footer.shopHeading")}</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {PRODUCT_CATEGORIES.map((category) => (
              <li key={category}>
                <Link to={`/shop?category=${category}`} className={linkClass}>
                  {t(`collections.${category}`)}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav data-footer-block aria-label={t("footer.company")}>
          <h2 className="type-title text-base" lang="en">
            {t("footer.companyHeading")}
          </h2>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <AboutLink className={linkClass}>{t("footer.aboutLink")}</AboutLink>
            </li>
            <li>
              <Link to="/wishlist" className={linkClass}>
                {t("footer.wishlistLink")}
              </Link>
            </li>
            <li>
              <Link to="/cart" className={linkClass}>
                {t("footer.bagLink")}
              </Link>
            </li>
          </ul>
        </nav>
      </Container>
    </footer>
  );
}
