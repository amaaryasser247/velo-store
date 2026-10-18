import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate, type LinkProps } from "react-router-dom";
import { scrollToSection } from "../../lib/scroll";

/** The about section of the home page; the /about route redirects here too. */
export const ABOUT_SECTION_ID = "about";
export const ABOUT_HREF = `/#${ABOUT_SECTION_ID}`;

type AboutLinkProps = Omit<LinkProps, "to" | "onClick"> & {
  /** Runs when the link activates; the mobile menu closes itself with this. */
  onNavigate?: () => void;
};

/**
 * About is a section of the single-page home flow, not a route of its own.
 * On the home page the click scrolls straight to the section (so it works
 * every time, even when the hash is already set); anywhere else it navigates
 * home and ScrollManager lands on the section.
 */
export default function AboutLink({ onNavigate, ...rest }: AboutLinkProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    // Let modified clicks (new tab, download, ...) keep the plain href.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate?.();
    if (pathname === "/") {
      scrollToSection(ABOUT_SECTION_ID);
    } else {
      navigate(ABOUT_HREF);
    }
  }

  return <Link to={ABOUT_HREF} onClick={handleClick} {...rest} />;
}
