// ==============================================================================
// File: .//Description-of-file/user_profile_menu.md
// Overview: Top-right corner user profile avatar with interactive account dropdown menu.
// ==============================================================================

"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { User, LogOut, LogIn, Bookmark, FileText, ChevronDown, Shield } from "lucide-react";

interface UserProfileMenuProps {
  onOpenAuth: () => void;
  onOpenDrawer: () => void;
}

export default function UserProfileMenu({
  onOpenAuth,
  onOpenDrawer,
}: UserProfileMenuProps) {
  const { user, logout, loading } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click or Escape key
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (loading) {
    return (
      <div className="w-8 h-8 border border-neutral-300 dark:border-neutral-700 animate-pulse" />
    );
  }

  // Guest State: Shows login button or guest avatar
  if (!user) {
    return (
      <button
        onClick={onOpenAuth}
        className="flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-white font-mono text-xs font-bold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors select-none"
        title="เข้าสู่ระบบ หรือ สมัครสมาชิก"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>เข้าสู่ระบบ</span>
      </button>
    );
  }

  // Authenticated State: Avatar badge with interactive menu
  const initialLetter = (user.display_name || user.username || "U").charAt(0).toUpperCase();

  const formatJoinDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const months = [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  return (
    <div className="relative font-mono" ref={menuRef}>
      {/* Profile Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        className={`flex items-center gap-2 p-1 pl-1.5 border transition-colors select-none ${
          isOpen
            ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black"
            : "border-black dark:border-white bg-transparent text-black dark:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
        }`}
        title="โปรไฟล์และเมนูบัญชีผู้ใช้"
      >
        {/* Initial Avatar Square */}
        <span className="w-6 h-6 border border-current flex items-center justify-center font-bold text-xs uppercase">
          {initialLetter}
        </span>

        {/* Display name snippet (hidden on small mobile) */}
        <span className="text-xs font-bold max-w-[90px] truncate hidden sm:inline">
          {user.display_name}
        </span>

        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Profile Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 border border-black dark:border-white bg-white dark:bg-black text-black dark:text-white shadow-2xl z-50 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User Details Header */}
          <div className="p-3 border-b border-black dark:border-white space-y-1 bg-neutral-50 dark:bg-neutral-950">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm truncate" title={user.display_name}>
                {user.display_name}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 border border-black dark:border-white font-semibold">
                {user.role === "admin" ? "ADMIN" : "MEMBER"}
              </span>
            </div>
            <div className="text-xs text-neutral-500 truncate">
              @{user.username}
            </div>
            <div className="text-[11px] text-neutral-400 pt-1">
              สมาชิกตั้งแต่ {formatJoinDate(user.created_at)}
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-1 space-y-0.5 text-xs">
            {/* My Threads Link */}
            <Link
              href={`/?q=${encodeURIComponent(user.display_name)}`}
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>กระทู้ของฉัน</span>
            </Link>

            {/* Bookmarks Drawer Trigger */}
            <button
              onClick={() => {
                setIsOpen(false);
                onOpenDrawer();
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>คลังกระทู้ที่บันทึกไว้</span>
            </button>
          </div>

          {/* Logout Action */}
          <div className="p-1 border-t border-black dark:border-white">
            <button
              onClick={async () => {
                setIsOpen(false);
                await logout();
              }}
              className="flex items-center gap-2 w-full text-left px-3 py-2 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>ออกจากระบบ (Sign Out)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
