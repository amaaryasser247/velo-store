import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { scrollToSection } from "../../lib/scroll";

/**
 * On route changes: land on the hash target when there is one (the About
 * entries use "/#about"), scroll to the top otherwise, and move focus to the
 * main region for keyboard and screen reader users.
 */
export default function ScrollManager() {
  const { pathname, hash } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    const pathChanged = previousPath.current !== pathname;
    previousPath.current = pathname;
    const target = hash === "" ? null : document.getElementById(hash.slice(1));

    if (target) {
      scrollToSection(target.id);
      if (pathChanged) document.getElementById("main")?.focus({ preventScroll: true });
      return;
    }

    if (!pathChanged) return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    document.getElementById("main")?.focus({ preventScroll: true });
  }, [pathname, hash]);

  return null;
}
