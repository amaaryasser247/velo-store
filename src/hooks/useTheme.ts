import { useCallback, useState } from "react";
import { STORAGE_KEYS, writeStorage } from "../utils/storage";

export type ColorTheme = "light" | "dark";

/** The DOM attribute the stylesheet keys the dark palette on. */
const THEME_ATTRIBUTE = "data-theme";

/** Marks the html element for the duration of a non-view-transition swap. */
const SWITCHING_CLASS = "theme-transition";

/** Slightly longer than the 0.4s colour transition this class enables. */
const SWITCHING_MS = 500;

/** Lets a rapid second toggle restart the window instead of ending it early. */
let switchingTimer: number | undefined;

function readInitialTheme(): ColorTheme {
  // index.html sets the attribute before React renders (no flash of light),
  // so the DOM is also the source of truth; storage is only a double check.
  return document.documentElement.hasAttribute(THEME_ATTRIBUTE) ? "dark" : "light";
}

function applyTheme(theme: ColorTheme): void {
  if (theme === "dark") {
    document.documentElement.setAttribute(THEME_ATTRIBUTE, "dark");
  } else {
    document.documentElement.removeAttribute(THEME_ATTRIBUTE);
  }
}

/** View transitions are progressive; older browsers simply switch instantly. */
type DocumentWithTransition = Document & {
  startViewTransition?: (applyChange: () => void) => { finished: Promise<void> };
};

/**
 * The colour theme. `toggleTheme` animates the swap: where the browser
 * supports the View Transitions API the new palette is revealed as a circle
 * growing from the toggle button, and as a smooth colour cross-fade
 * everywhere else. `prefers-reduced-motion` users get an instant switch.
 */
export function useTheme() {
  const [theme, setTheme] = useState<ColorTheme>(readInitialTheme);

  const commit = useCallback((next: ColorTheme) => {
    setTheme(next);
    writeStorage(STORAGE_KEYS.theme, next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(
    (fromX?: number, fromY?: number) => {
      const next: ColorTheme = theme === "dark" ? "light" : "dark";
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const doc = document as DocumentWithTransition;
      const root = document.documentElement;
      if (reduced) {
        commit(next);
        return;
      }
      if (typeof doc.startViewTransition !== "function") {
        // No View Transitions API: fall back to a smooth cross-fade by
        // giving every colour change a transition for this one swap only.
        root.classList.add(SWITCHING_CLASS);
        commit(next);
        window.clearTimeout(switchingTimer);
        switchingTimer = window.setTimeout(() => root.classList.remove(SWITCHING_CLASS), SWITCHING_MS);
        return;
      }
      root.style.setProperty("--tv-x", `${Math.round(fromX ?? window.innerWidth)}px`);
      root.style.setProperty("--tv-y", `${Math.round(fromY ?? 0)}px`);
      doc.startViewTransition(() => commit(next));
    },
    [commit, theme],
  );

  return { theme, toggleTheme };
}
