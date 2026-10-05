// ==============================================================================
// File: .//Description-of-file/theme_types.md
// Overview: Domain types and contracts for application theme management.
// ==============================================================================

export type ThemeMode = "light" | "dark";

export interface IThemeService {
  getTheme(): ThemeMode;
  setTheme(theme: ThemeMode): void;
  toggleTheme(): ThemeMode;
  subscribe(listener: (theme: ThemeMode) => void): () => void;
}
