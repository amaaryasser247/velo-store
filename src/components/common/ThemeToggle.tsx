import { Moon, Sun } from "lucide-react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../hooks/useTheme";
import { gsap, prefersReducedMotion, useGSAP } from "../../lib/gsap";
import { EASE } from "../../lib/motion";

const iconButton = "relative grid size-10 place-items-center rounded-full hover:bg-chalk sm:size-11";

/**
 * Light/dark switch. The sun and moon cross-rotate into each other with a GSAP
 * tween, and the palette itself flips with a circular reveal starting exactly
 * where the visitor clicked (see useTheme). Instant for reduced motion.
 */
export default function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const dark = theme === "dark";
  const sunRef = useRef<HTMLSpanElement>(null);
  const moonRef = useRef<HTMLSpanElement>(null);
  const firstRun = useRef(true);

  useGSAP(
    () => {
      const sun = sunRef.current;
      const moon = moonRef.current;
      if (!sun || !moon) return;

      const place = (): void => {
        gsap.set(sun, { autoAlpha: dark ? 0 : 1, rotate: 0, scale: 1 });
        gsap.set(moon, { autoAlpha: dark ? 1 : 0, rotate: 0, scale: 1 });
      };

      if (firstRun.current || prefersReducedMotion()) {
        firstRun.current = false;
        place();
        return;
      }

      gsap.to(sun, {
        autoAlpha: dark ? 0 : 1,
        rotate: dark ? -100 : 0,
        scale: dark ? 0.4 : 1,
        duration: 0.3,
        ease: EASE.micro,
        overwrite: true,
      });
      gsap.to(moon, {
        autoAlpha: dark ? 1 : 0,
        rotate: dark ? 0 : 100,
        scale: dark ? 1 : 0.4,
        duration: 0.3,
        ease: EASE.micro,
        overwrite: true,
      });
    },
    { dependencies: [dark], scope: sunRef },
  );

  return (
    <button
      type="button"
      onClick={(event) => toggleTheme(event.clientX, event.clientY)}
      aria-label={dark ? t("theme.toLight") : t("theme.toDark")}
      aria-pressed={dark}
      className={iconButton}
    >
      <span ref={sunRef} className="col-start-1 row-start-1 grid place-items-center">
        <Sun className="size-5" aria-hidden="true" />
      </span>
      <span ref={moonRef} className="col-start-1 row-start-1 grid place-items-center">
        <Moon className="size-5" aria-hidden="true" />
      </span>
    </button>
  );
}
