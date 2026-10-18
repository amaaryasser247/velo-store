import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { gsap, prefersReducedMotion, ScrollTrigger, useGSAP } from "../../lib/gsap";
import { DUR, EASE } from "../../lib/motion";
import AnnouncementBar from "./AnnouncementBar";
import Footer from "./Footer";
import Navbar from "./Navbar";
import ScrollManager from "./ScrollManager";

/**
 * Keeps ScrollTrigger's measurements honest: the variable font and the lazy
 * product images both settle the layout after the first paint - and a live
 * language switch changes the page heights (Arabic metrics, the hero
 * wordmark swap), so every start/end below the hero must re-measure too.
 */
function useLayoutRefresh(): void {
  const { i18n } = useTranslation();
  useEffect(() => {
    const refresh = (): void => ScrollTrigger.refresh();
    const timer = window.setTimeout(refresh, 500);
    window.addEventListener("load", refresh);
    let cancelled = false;
    void document.fonts.ready.then(() => {
      if (!cancelled) refresh();
    });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      window.removeEventListener("load", refresh);
    };
  }, [i18n.resolvedLanguage]);
}

export default function Layout() {
  const { t } = useTranslation();
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();
  useLayoutRefresh();

  // Enter-only route transition (max 350ms, never delays navigation). Fades
  // opacity - not autoAlpha - so the focused main region is never
  // visibility:hidden while ScrollManager moves focus into it. Rise is on y,
  // so it reads the same in both directions.
  useGSAP(
    () => {
      const main = mainRef.current;
      if (!main || prefersReducedMotion()) return;
      gsap.fromTo(
        main,
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: DUR.quick,
          ease: EASE.out,
          clearProps: "opacity,transform",
          overwrite: true,
        },
      );
    },
    { dependencies: [pathname], scope: mainRef },
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="skip-link">
        {t("common.skipToContent")}
      </a>
      <ScrollManager />
      <AnnouncementBar />
      <Navbar />
      <main ref={mainRef} id="main" tabIndex={-1} className="flex-1 outline-none">
        <Outlet />
      </main>
      {/* Opaque plate under the footer gap: the fixed home hero photo must
          never show through the space the footer's top margin used to leave
          (that margin now lives here as padding). */}
      <div className="bg-paper pt-24">
        <Footer />
      </div>
    </div>
  );
}
