// ==============================================================================
// File: .//Description-of-file/use_theme.md
// Overview: Custom React hook exposing theme state, toggle, and setters.
// ==============================================================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { ThemeMode } from "@/lib/theme/types";
import { themeService } from "@/lib/theme/themeService";

export interface UseThemeResult {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
  isMounted: boolean;
}

export function useTheme(): UseThemeResult {
  const [theme, setLocalTheme] = useState<ThemeMode>("light");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Align with initial DOM state set by anti-flash script
    const hasDarkClass = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
    const initialTheme: ThemeMode = hasDarkClass ? "dark" : themeService.getTheme();
    setLocalTheme(initialTheme);

    const unsubscribe = themeService.subscribe((updatedTheme) => {
      setLocalTheme(updatedTheme);
    });

    return unsubscribe;
  }, []);

  const toggleTheme = useCallback(() => {
    const next = themeService.toggleTheme();
    setLocalTheme(next);
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    themeService.setTheme(newTheme);
    setLocalTheme(newTheme);
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
    isMounted,
  };
}
