// ==============================================================================
// File: .//Description-of-file/theme_toggle.md
// Overview: High-contrast Swiss-style segmented button to switch theme between White and Black.
// ==============================================================================

"use client";

import React from "react";
import { useTheme } from "@/hooks/useTheme";
import { Sun, Moon, Check } from "lucide-react";

interface ThemeToggleProps {
  className?: string;
}

export default function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const { theme, setTheme, isMounted } = useTheme();

  if (!isMounted) {
    return (
      <div
        className={`inline-flex border border-black dark:border-white font-mono text-xs opacity-50 ${className}`}
        aria-hidden="true"
      >
        <span className="px-2.5 py-1.5 border-r border-black dark:border-white">ขาว</span>
        <span className="px-2.5 py-1.5">ดำ</span>
      </div>
    );
  }

  const isLight = theme === "light";
  const isDark = theme === "dark";

  return (
    <div
      role="radiogroup"
      aria-label="เปลี่ยนธีมสี (ขาว / ดำ)"
      className={`inline-flex items-center border border-black dark:border-white select-none font-mono text-xs bg-white dark:bg-black ${className}`}
    >
      {/* Light Theme Button (ขาว) */}
      <button
        type="button"
        role="radio"
        aria-checked={isLight}
        onClick={() => setTheme("light")}
        className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors cursor-pointer border-r border-black dark:border-white ${
          isLight
            ? "bg-black text-white font-bold"
            : "bg-transparent text-neutral-400 hover:text-white dark:hover:text-white hover:bg-neutral-900/40"
        }`}
        title="เปลี่ยนเป็นธีมขาว (Light Theme)"
      >
        <Sun className="w-3.5 h-3.5" />
        <span>ขาว</span>
        {isLight && <Check className="w-3 h-3 stroke-[3]" />}
      </button>

      {/* Dark Theme Button (ดำ) */}
      <button
        type="button"
        role="radio"
        aria-checked={isDark}
        onClick={() => setTheme("dark")}
        className={`flex items-center gap-1.5 px-3 py-1.5 transition-colors cursor-pointer ${
          isDark
            ? "bg-white text-black font-bold"
            : "bg-transparent text-neutral-500 hover:text-black hover:bg-neutral-100"
        }`}
        title="เปลี่ยนเป็นธีมดำ (Dark Theme)"
      >
        <Moon className="w-3.5 h-3.5" />
        <span>ดำ</span>
        {isDark && <Check className="w-3 h-3 stroke-[3]" />}
      </button>
    </div>
  );
}
