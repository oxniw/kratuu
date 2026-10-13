// ==============================================================================
// File: .//Description-of-file/header.md
// Overview: Top navigation header with brand mark, theme switcher, bookmarks, create thread button, and user profile menu.
// ==============================================================================

"use client"; // Enable React Client Component features

import React, { useEffect, useState } from "react"; // Import React core hooks
import Link from "next/link"; // Import Link component for routing
import { useRouter } from "next/navigation"; // Import Next.js router hook
import { getBookmarks } from "@/lib/storage"; // Import storage bookmark resolver
import ThemeToggle from "@/components/ThemeToggle"; // Import theme toggle component
import AuthModal from "@/components/AuthModal"; // Import authentication modal
import UserProfileMenu from "@/components/UserProfileMenu"; // Import user profile menu
import CategoryDrawer from "@/components/CategoryDrawer"; // Import board directory slide-out drawer
import { Bookmark, List, PenLine } from "lucide-react"; // Import navigation icons
import { useAuthGuard } from "@/hooks/useAuthGuard"; // Import authentication guard hook

interface HeaderProps { // Contract for Header properties
  onOpenDrawer?: () => void; // Callback to open bookmarks drawer
  hideNewThreadButton?: boolean; // Flag to hide create thread button on board page
} // End HeaderProps interface

export default function Header({ onOpenDrawer = () => {}, hideNewThreadButton = false }: HeaderProps) { // Renders top application header
  const router = useRouter(); // Initialize router instance for navigation
  const { isAuthenticated, requireAuth } = useAuthGuard(); // Extract authentication guard trigger
  const [bookmarkCount, setBookmarkCount] = useState(0); // Store count of saved bookmarks
  const [authModalOpen, setAuthModalOpen] = useState(false); // Track auth modal visibility
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login"); // Track auth modal active mode
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false); // Track board directory drawer visibility

  useEffect(() => { // Mount effect synchronizing bookmarks count
    setBookmarkCount(getBookmarks().length); // Set initial bookmark count
    const handleStorageUpdate = () => { // Storage change listener
      setBookmarkCount(getBookmarks().length); // Update bookmark count
    }; // End handleStorageUpdate
    window.addEventListener("kratuu_storage_updated", handleStorageUpdate); // Attach event listener
    return () => { // Cleanup listener on unmount
      window.removeEventListener("kratuu_storage_updated", handleStorageUpdate); // Remove listener
    }; // End cleanup
  }, []); // Run effect once on mount

  const openLogin = () => { // Opens auth modal in login tab
    setAuthModalMode("login"); // Set mode to login
    setAuthModalOpen(true); // Open modal
  }; // End openLogin

  const handleOpenDrawer = () => { // Handles bookmarks drawer click with auth requirement
    requireAuth(() => onOpenDrawer(), "เข้าดูคลังกระทู้"); // Require auth before opening bookmarks
  }; // End handleOpenDrawer

  const handleNewThreadClick = (e: React.MouseEvent) => { // Handles new thread creation button click
    if (!isAuthenticated) { // Check if user is not authenticated
      e.preventDefault(); // Stop default navigation
      requireAuth(() => router.push("/new"), "สร้างกระทู้ใหม่"); // Trigger auth requirement modal
    } // End auth check
  }; // End handleNewThreadClick

  return ( // Render header component layout
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

            {/* 3. Create Thread Button (shown on every page except board page) */}
            {!hideNewThreadButton && (
              <Link
                href="/new"
                onClick={handleNewThreadClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-85 transition-opacity font-medium cursor-pointer"
                title="สร้างกระทู้ใหม่"
              >
                <PenLine className="w-4 h-4" />
                <span className="hidden sm:inline">สร้างกระทู้</span>
              </Link>
            )}

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
  ); // End render
} // End Header
