// ==============================================================================
// File: .//Description-of-file/storage.md
// Overview: Browser localStorage utilities for user bookmarks, recents, and handle.
// ==============================================================================

"use client";

export interface BookmarkedThread {
  id: string;
  title: string;
  category: string;
  saved_at: number;
}

export interface RecentThread {
  id: string;
  title: string;
  category: string;
  viewed_at: number;
}

const BOOKMARKS_KEY = "kratuu_bookmarks";
const RECENTS_KEY = "kratuu_recents";
const USER_HANDLE_KEY = "kratuu_user_handle";
const THEME_KEY = "kratuu_theme";

export function getBookmarks(): BookmarkedThread[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(id: string): boolean {
  return getBookmarks().some((b) => b.id === id);
}

export function toggleBookmark(item: { id: string; title: string; category: string }): boolean {
  const current = getBookmarks();
  const exists = current.some((b) => b.id === item.id);
  let updated: BookmarkedThread[];
  if (exists) {
    updated = current.filter((b) => b.id !== item.id);
  } else {
    updated = [{ ...item, saved_at: Date.now() }, ...current];
  }
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("kratuu_storage_updated"));
  return !exists;
}

export function addRecentView(item: { id: string; title: string; category: string }) {
  if (typeof window === "undefined") return;
  try {
    const current: RecentThread[] = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    const filtered = current.filter((r) => r.id !== item.id);
    const updated = [{ ...item, viewed_at: Date.now() }, ...filtered].slice(0, 15);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("kratuu_storage_updated"));
  } catch {
    // Ignore storage issues
  }
}

export function getRecentViews(): RecentThread[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function getStoredHandle(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(USER_HANDLE_KEY) || "";
}

export function setStoredHandle(handle: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(USER_HANDLE_KEY, handle.trim());
}

export function getTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyTheme(theme: "light" | "dark") {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
  localStorage.setItem(THEME_KEY, theme);
  window.dispatchEvent(new Event("kratuu_theme_changed"));
}
