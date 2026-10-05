// ==============================================================================
// File: .//Description-of-file/header.md
// Overview: Top navigation header with brand mark, theme switcher, bookmarks, and user profile menu.
// ==============================================================================

"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { getBookmarks } from "@/lib/storage";
import ThemeToggle from "@/components/ThemeToggle";
import AuthModal from "@/components/AuthModal";
import UserProfileMenu from "@/components/UserProfileMenu";
import CategoryDrawer from "@/components/CategoryDrawer";
import { Bookmark, PenLine, List } from "lucide-react";

import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useRouter } from "next/navigation";

interface HeaderProps {
  onOpenDrawer?: () => void;
}

export default function Header({ onOpenDrawer = () => {} }: HeaderProps) {
  const router = useRouter();
  const { isAuthenticated, requireAuth } = useAuthGuard();
  const [bookmarkCount, setBookmarkCount] = useState(0);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);

  useEffect(() => {
    setBookmarkCount(getBookmarks().length);

    const handleStorageUpdate = () => {
      setBookmarkCount(getBookmarks().length);
    };

    window.addEventListener("kratuu_storage_updated", handleStorageUpdate);
    return () => {
      window.removeEventListener("kratuu_storage_updated", handleStorageUpdate);
    };
  }, []);

  const openLogin = () => {
    setAuthModalMode("login");
    setAuthModalOpen(true);
  };

  const handleOpenDrawer = () => {
    requireAuth(() => onOpenDrawer(), "เข้าดูคลังกระทู้");
  };

  const handleNewThreadClick = (e: React.MouseEvent) => {
    if (!isAuthenticated) {
      e.preventDefault();
      requireAuth(() => router.push("/new"), "ตั้งกระทู้ใหม่");
    }
  };

  return (
    <>
      <header className="border-b border-black dark:border-white bg-white dark:bg-black text-black dark:text-white sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Brand & Left Menu Trigger */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCategoryDrawerOpen(true)}
              className="p-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer flex items-center justify-center"
              title="ห้องและหมวดหมู่สนทนา"
              aria-label="เปิดสารบัญห้องสนทนา"
            >
              <List className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
            </button>

            <Link href="/" className="group flex items-baseline gap-2 text-decoration-none">
              <span className="text-2xl font-black tracking-tighter uppercase font-mono group-hover:underline">
                kratuu
              </span>
              <span className="text-xs font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                [กระทู้]
              </span>
            </Link>
          </div>

          {/* Top Right Action Items */}
          <div className="flex items-center gap-2 sm:gap-3 text-sm">
            {/* 1. Theme Switcher [ขาว | ดำ] */}
            <ThemeToggle />

            {/* 2. Bookmarks Drawer Trigger */}
            <button
              onClick={handleOpenDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
              title="กระทู้ที่บันทึกไว้และประวัติเข้าชม"
            >
              <Bookmark className="w-4 h-4" />
              <span className="hidden sm:inline">คลังกระทู้</span>
              {bookmarkCount > 0 && (
                <span className="text-xs font-mono px-1 border border-current">
                  {bookmarkCount}
                </span>
              )}
            </button>

            {/* 3. New Thread Button */}
            <Link
              href="/new"
              onClick={handleNewThreadClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity font-medium cursor-pointer"
            >
              <PenLine className="w-4 h-4" />
              <span className="hidden sm:inline">ตั้งกระทู้</span>
            </Link>

            {/* 4. Top-Right Corner User Profile Menu */}
            <UserProfileMenu
              onOpenAuth={openLogin}
              onOpenDrawer={onOpenDrawer}
            />
          </div>
        </div>
      </header>

      {/* Left Board Directory Drawer */}
      <CategoryDrawer
        isOpen={categoryDrawerOpen}
        onClose={() => setCategoryDrawerOpen(false)}
      />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </>
  );
}
