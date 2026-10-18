import { User, X } from "lucide-react";
import { useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { isRtl } from "../../i18n";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/gsap";
import { EASE, STAGGER } from "../../lib/motion";
import LanguageSwitcher from "../common/LanguageSwitcher";
import AboutLink, { ABOUT_HREF } from "./AboutLink";

export type NavItem = {
  to: string;
  label: string;
};

export type MobileAccount = {
  to: string;
  label: string;
  /** Initial shown in the badge; `null` while anonymous (User icon instead). */
  initial: string | null;
};

type MobileMenuProps = {
  open: boolean;
  onClose: () => void;
  links: readonly NavItem[];
  account: MobileAccount;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
};

/** +1 slides from the right edge (LTR), -1 mirrors it for RTL. */
function slideSign(): number {
  return isRtl() ? -1 : 1;
}

export default function MobileMenu({ open, onClose, links, account, returnFocusRef }: MobileMenuProps) {
  const { t } = useTranslation();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(open);
  const exitTlRef = useRef<gsap.core.Timeline | null>(null);

  // Keep the panel mounted while it slides out: once the exit tween has run,
  // setVisible(false) lets it unmount. Documented render-phase state
  // adjustment (prop -> state), so no effect round-trip is needed.
  if (open && !visible) {
    setVisible(true);
  }

  /** Slide the panel out, then tell the parent; instant for reduced motion. */
  function requestClose(): void {
    if (exitTlRef.current?.isActive()) return;
    const panel = panelRef.current;
    if (!panel || prefersReducedMotion()) {
      setVisible(false);
      onClose();
      return;
    }
    const menuLinks = gsap.utils.toArray<HTMLElement>("[data-menu-link]", panel);
    const tl = gsap.timeline({
      onComplete: () => {
        setVisible(false);
        onClose();
      },
    });
    exitTlRef.current = tl;
    tl.to(
      menuLinks,
      { y: -12, autoAlpha: 0, duration: 0.15, ease: "power2.in", stagger: { each: 0.03, from: "end" }, overwrite: true },
      0,
    );
    tl.to(
      panel,
      { xPercent: 100 * slideSign(), duration: 0.32, ease: EASE.inOut, overwrite: true },
      0.03,
    );
  }

  // Latest close handler, readable from the keydown listener without making
  // the focus-trap effect re-bind on every render.
  const closeFnRef = useRef(requestClose);
  useEffect(() => {
    closeFnRef.current = requestClose;
  });

  // Entrance whenever the panel mounts (client-side navigation remounts the
  // whole Navbar tree, but the menu itself only mounts when opened).
  useGSAP(
    () => {
      const panel = panelRef.current;
      if (!panel) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const menuLinks = gsap.utils.toArray<HTMLElement>("[data-menu-link]", panel);
        const tl = gsap.timeline({ defaults: { ease: EASE.out } });
        tl.fromTo(
          panel,
          { xPercent: 100 * slideSign() },
          { xPercent: 0, duration: 0.4, ease: EASE.inOut },
        );
        tl.fromTo(
          menuLinks,
          { y: 26, autoAlpha: 0 },
          { y: 0, autoAlpha: 1, duration: 0.4, stagger: STAGGER.tight },
          0.12,
        );
      });
      return () => mm.revert();
    },
    { scope: panelRef, dependencies: [visible], revertOnUpdate: true },
  );

  // Focus trap, Escape handling and scroll lock while the panel is mounted.
  useEffect(() => {
    if (!visible) return undefined;

    const trigger = returnFocusRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        closeFnRef.current();
        return;
      }
      if (event.key !== "Tab" || panelRef.current === null) return;

      const focusable = panelRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      trigger?.focus();
    };
  }, [visible, returnFocusRef]);

  if (!visible) return null;

  // Portalled onto <body>: while the panel is a child of the sticky header,
  // any transform GSAP leaves on that header (the load intro, the scroll-away
  // stretch) becomes the containing block for this fixed panel and clips it
  // to the header bar until the transform clears.
  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-label={t("nav.menu")}
      data-theme="dark"
      className="fixed inset-0 z-50 flex flex-col bg-ink text-on-brand"
    >
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <span className="type-display text-3xl" lang="en">
          VELO
        </span>
        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="menu" />
          <button
            ref={closeRef}
            type="button"
            onClick={requestClose}
            aria-label={t("nav.closeMenu")}
            className="grid size-11 place-items-center rounded-full hover:bg-on-brand/15"
          >
            <X className="size-6" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 sm:px-6">
        <Link
          to={account.to}
          data-menu-link
          onClick={requestClose}
          aria-label={account.label}
          className="inline-flex items-center gap-3 rounded-full bg-on-brand/15 px-4 py-2.5 font-semibold hover:bg-on-brand/25"
        >
          {account.initial === null ? (
            <User className="size-5" aria-hidden="true" />
          ) : (
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded-full bg-on-brand/20 text-xs font-bold"
            >
              {account.initial}
            </span>
          )}
          {t("nav.account")}
        </Link>
      </div>

      <nav aria-label={t("nav.mobile")} className="flex-1 overflow-y-auto px-4 pb-10 pt-8 sm:px-6">
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.to}>
              {link.to === ABOUT_HREF ? (
                <AboutLink
                  data-menu-link
                  onNavigate={requestClose}
                  className="type-display block py-1 text-[clamp(2.75rem,14vw,5rem)] hover:text-on-brand/70"
                >
                  {link.label}
                </AboutLink>
              ) : (
                <Link
                  to={link.to}
                  data-menu-link
                  onClick={requestClose}
                  className="type-display block py-1 text-[clamp(2.75rem,14vw,5rem)] hover:text-on-brand/70"
                >
                  {link.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>,
    document.body,
  );
}
