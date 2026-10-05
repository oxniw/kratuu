// ==============================================================================
// File: .//Description-of-file/theme_service.md
// Overview: Decoupled theme service managing theme state, persistence, and DOM mutations.
// ==============================================================================

import { ThemeMode, IThemeService } from "./types";

const THEME_STORAGE_KEY = "kratuu_theme";
const THEME_CHANGE_EVENT = "kratuu_theme_changed";

class BrowserThemeService implements IThemeService {
  getTheme(): ThemeMode {
    if (typeof window === "undefined") return "light";
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored === "dark" || stored === "light") {
        return stored;
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    } catch {
      return "light";
    }
  }

  setTheme(theme: ThemeMode): void {
    if (typeof window === "undefined") return;
    if (theme !== "light" && theme !== "dark") return;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore private-browsing storage quota errors
    }

    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: theme }));
  }

  toggleTheme(): ThemeMode {
    const current = this.getTheme();
    const next: ThemeMode = current === "light" ? "dark" : "light";
    this.setTheme(next);
    return next;
  }

  subscribe(listener: (theme: ThemeMode) => void): () => void {
    if (typeof window === "undefined") {
      return () => {};
    }

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<ThemeMode>;
      listener(customEvent.detail || this.getTheme());
    };

    window.addEventListener(THEME_CHANGE_EVENT, handler);
    window.addEventListener("storage", (e) => {
      if (e.key === THEME_STORAGE_KEY) {
        listener(this.getTheme());
      }
    });

    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handler);
    };
  }
}

export const themeService: IThemeService = new BrowserThemeService();
