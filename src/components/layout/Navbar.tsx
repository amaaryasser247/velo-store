import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useCart } from "../../hooks/useCart";
import { useWishlist } from "../../hooks/useWishlist";
import { useFormat } from "../../i18n/format";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/gsap";
import { DUR, EASE } from "../../lib/motion";
import { firstNameOf, initialOf } from "../../utils/auth";
import Container from "../common/Container";
import LanguageSwitcher from "../common/LanguageSwitcher";
import ThemeToggle from "../common/ThemeToggle";
import AboutLink, { ABOUT_HREF } from "./AboutLink";
import MobileMenu, { type NavItem } from "./MobileMenu";

/** Wishlist and bag have icons in the header, so the desktop text nav omits them. */
const ICON_LINKS: readonly string[] = ["/wishlist", "/cart"];

/** Scroll distance after which the bar may slip away (stretch behaviour). */
const HIDE_AFTER = 140;

function isLinkActive(link: NavItem, pathname: string, search: string): boolean {
  const [path = "", query] = link.to.split("?");
  if (pathname !== path) return false;
  const isNewView = new URLSearchParams(search).get("new") === "1";
  if (path === "/shop") return query === "new=1" ? isNewView : !isNewView;
  return true;
}

/** Bag / wishlist counter that pulses whenever its value changes. */
function CountBadge({ count }: { count: number }) {
  const badgeRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const badge = badgeRef.current;
      if (!badge || prefersReducedMotion()) return;
      gsap.fromTo(
        badge,
        { scale: 1.35 },
        { scale: 1, duration: DUR.pulse, ease: EASE.out, overwrite: true },
      );
    },
    { dependencies: [count], scope: badgeRef },
  );

  if (count === 0) return null;
  return (
    <span
      ref={badgeRef}
      aria-hidden="true"
      className="absolute end-0 top-0 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-on-brand"
    >
      {count}
    </span>
  );
}

export default function Navbar() {
  const { t } = useTranslation();
  const { tPlural } = useFormat();
  const { itemCount } = useCart();
  const { count: wishlistCount } = useWishlist();
  const { user } = useAuth();
  const { pathname, search } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  // Anonymous: sign in. Signed in: the account page, labelled with the name
  // and badged with the initial.
  const accountTo = user === null ? "/login" : "/account";
  const accountLabel =
    user === null ? t("nav.account") : t("nav.accountNamed", { name: firstNameOf(user.name) });
  const accountInitial = user === null ? null : initialOf(user.name);

  const navLinks = useMemo<readonly NavItem[]>(
    () => [
      { to: "/shop", label: t("nav.shop") },
      { to: "/shop?new=1", label: t("nav.newArrivals") },
      { to: "/wishlist", label: t("nav.wishlist") },
      { to: "/cart", label: t("nav.bag") },
      { to: ABOUT_HREF, label: t("nav.about") },
    ],
    [t],
  );

  useGSAP(
    () => {
      const header = headerRef.current;
      if (!header) return;
      const mm = gsap.matchMedia();

      // Full page load slice of the hero intro: the header eases down.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          header,
          { y: -18 },
          { y: 0, duration: 0.55, ease: EASE.intro, clearProps: "transform" },
        );
      });

      // Stretch: below the fold the bar slips away while reading down and
      // returns on the way up. Always shown at the top, for keyboard focus
      // inside it, or when reduced motion is asked for. Driven by real scroll
      // events (rAF-throttled) so programmatic refreshes can never poke it.
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        let hidden = false;
        let lastY = window.scrollY;
        let raf = 0;
        const setHidden = (next: boolean): void => {
          if (next === hidden) return;
          hidden = next;
          gsap.to(header, {
            yPercent: next ? -105 : 0,
            duration: 0.4,
            ease: EASE.out,
            overwrite: true,
          });
        };
        const apply = (): void => {
          raf = 0;
          const y = window.scrollY;
          const delta = y - lastY;
          lastY = y;
          if (y <= HIDE_AFTER) {
            setHidden(false);
          } else if (Math.abs(delta) > 6) {
            setHidden(delta > 0 && !header.contains(document.activeElement));
          }
        };
        const onScroll = (): void => {
          if (!raf) raf = requestAnimationFrame(apply);
        };
        const onFocusIn = (): void => setHidden(false);
        window.addEventListener("scroll", onScroll, { passive: true });
        header.addEventListener("focusin", onFocusIn);
        return () => {
          if (raf) cancelAnimationFrame(raf);
          window.removeEventListener("scroll", onScroll);
          header.removeEventListener("focusin", onFocusIn);
          // These tweens are created in the scroll/focus handlers, after
          // mm.add has returned, so matchMedia cannot track them: without this
          // reset the bar would stay translated off-screen when the viewport
          // drops back below 768px while the bar is hidden.
          gsap.killTweensOf(header);
          gsap.set(header, { clearProps: "transform,translate,rotate,scale" });
        };
      });

      return () => mm.revert();
    },
    { scope: headerRef },
  );

  const iconButton =
    "relative grid size-11 place-items-center rounded-full hover:bg-chalk";

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-fog bg-surface">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link to="/" aria-label={t("nav.home")}>
          <span lang="en" className="type-display text-2xl sm:text-3xl">
            VELO
          </span>
        </Link>

        <nav aria-label={t("nav.primary")} className="hidden md:block">
          <ul className="flex items-center gap-8 text-sm font-semibold">
            {navLinks.filter((link) => !ICON_LINKS.includes(link.to)).map((link) => {
              if (link.to === ABOUT_HREF) {
                return (
                  <li key={link.to}>
                    <AboutLink className="underline-offset-8 decoration-ring decoration-2 hover:underline">
                      {link.label}
                    </AboutLink>
                  </li>
                );
              }
              const active = isLinkActive(link, pathname, search);
              return (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    aria-current={active ? "page" : undefined}
                    className={`underline-offset-8 decoration-ring decoration-2 hover:underline ${
                      active ? "underline" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-0.5 sm:gap-1">
          <ThemeToggle />
          <LanguageSwitcher />
          <Link to="/shop" state={{ focusSearch: true }} aria-label={t("nav.search")} className={iconButton}>
            <Search className="size-5" aria-hidden="true" />
          </Link>
          <Link
            to={accountTo}
            aria-label={accountLabel}
            data-account-link
            className={`${iconButton} max-[400px]:hidden`}
          >
            {accountInitial === null ? (
              <User className="size-5" aria-hidden="true" />
            ) : (
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-full bg-brand text-xs font-bold text-on-brand"
              >
                {accountInitial}
              </span>
            )}
          </Link>
          <Link
            to="/wishlist"
            aria-label={tPlural("nav.wishlistCount", wishlistCount)}
            className={`${iconButton} max-[400px]:hidden`}
          >
            <Heart className="size-5" aria-hidden="true" />
            <CountBadge count={wishlistCount} />
          </Link>
          <Link
            to="/cart"
            aria-label={tPlural("nav.bagCount", itemCount)}
            className={iconButton}
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            <CountBadge count={itemCount} />
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label={t("nav.openMenu")}
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            className={`${iconButton} md:hidden`}
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
        </div>
      </Container>

      <MobileMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        links={navLinks}
        account={{ to: accountTo, label: accountLabel, initial: accountInitial }}
        returnFocusRef={menuButtonRef}
      />
    </header>
  );
}
