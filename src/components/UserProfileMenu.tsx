// ==============================================================================
// File: .//Description-of-file/user_profile_menu.md
// Overview: Top-right corner user profile avatar with interactive account dropdown menu.
// ==============================================================================

"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth"; // Import authentication hook
import { getRoleBadgeInfo, VALID_ROLES, Role } from "@/lib/auth/roles"; // Import role helpers and types
import { User, LogOut, LogIn, Bookmark, FileText, ChevronDown, Shield } from "lucide-react"; // Import UI icons

interface UserProfileMenuProps { // Component props interface
  onOpenAuth: () => void; // Trigger auth modal
  onOpenDrawer: () => void; // Trigger bookmarks drawer
} // End UserProfileMenuProps

export default function UserProfileMenu({ // Main UserProfileMenu component
  onOpenAuth, // Auth trigger
  onOpenDrawer, // Drawer trigger
}: UserProfileMenuProps) {
  const { user, logout, loading, refreshUser } = useAuth(); // Destructure auth utilities
  const [isOpen, setIsOpen] = useState(false); // Track dropdown visibility
  const [switchingRole, setSwitchingRole] = useState(false); // Loading state for role switch
  const [roleMsg, setRoleMsg] = useState(""); // Feedback message for role change
  const menuRef = useRef<HTMLDivElement>(null); // Reference to dropdown menu container

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
  const initialLetter = (user.display_name || user.username || "U").charAt(0).toUpperCase(); // Extract initial
  const badge = getRoleBadgeInfo(user.role); // Resolve role badge metadata

  const handleRoleChange = async (targetRole: Role) => { // Trigger role transition via API
    if (user.role === targetRole || switchingRole) return; // Prevent redundant requests
    try { // Begin request try block
      setSwitchingRole(true); // Turn on loading state
      setRoleMsg(""); // Clear previous feedback
      const res = await fetch("/api/auth/role", { // Call role management API
        method: "POST", // HTTP method
        headers: { "Content-Type": "application/json" }, // JSON headers
        body: JSON.stringify({ role: targetRole }), // Send target role payload
      }); // End fetch
      const data = await res.json(); // Parse response JSON
      if (res.ok) { // Check if request succeeded
        await refreshUser(); // Re-fetch current user profile from server
        setRoleMsg(`สลับเป็น ${targetRole.toUpperCase()} สำเร็จ`); // Success message
      } else { // Handle server-side error
        setRoleMsg(data.error || "เปลี่ยนสิทธิ์ไม่สำเร็จ"); // Error message
      } // End if-else
    } catch { // Catch network failure
      setRoleMsg("เชื่อมต่อไม่สำเร็จ"); // Connection error
    } finally { // Finalize execution
      setSwitchingRole(false); // Turn off loading state
    } // End finally
  }; // End handleRoleChange

  const formatJoinDate = (timestamp: number) => { // Format join date
    const d = new Date(timestamp); // Date instance
    const months = [ // Thai month abbreviations
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
    ];
    return `${months[d.getMonth()]} ${d.getFullYear() + 543}`; // Thai Buddhist era string
  }; // End formatJoinDate

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

        {/* Role mini tag */}
        <span className={badge.className}>
          {badge.label}
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
              <span className={badge.className} title={badge.description}>
                {badge.tag}
              </span>
            </div>
            <div className="text-xs text-neutral-500 truncate">
              @{user.username}
            </div>
            <div className="text-[11px] text-neutral-400 pt-1">
              สมาชิกตั้งแต่ {formatJoinDate(user.created_at)}
            </div>
          </div>

          {/* Role System Section */}
          <div className="p-3 border-b border-black dark:border-white space-y-1.5 bg-neutral-100 dark:bg-neutral-900">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>ระดับสิทธิ์ (Role)</span>
              </span>
              <span className={badge.className}>{badge.tag}</span>
            </div>
            <p className="text-[10px] text-neutral-600 dark:text-neutral-400">
              {badge.description}
            </p>
            <div className="pt-1 flex items-center gap-1">
              {VALID_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  disabled={switchingRole || user.role === r}
                  onClick={() => handleRoleChange(r)}
                  className={`flex-1 py-1 text-[10px] font-mono uppercase font-bold border transition-colors cursor-pointer ${
                    user.role === r
                      ? "bg-black text-white dark:bg-white dark:text-black border-black dark:border-white shadow-sm"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white hover:bg-white dark:hover:bg-black opacity-80"
                  }`}
                  title={`สลับบทบาทเป็น ${r.toUpperCase()}`}
                >
                  {r}
                </button>
              ))}
            </div>
            {roleMsg && (
              <p className="text-[10px] text-neutral-600 dark:text-neutral-400 font-mono pt-0.5">
                {roleMsg}
              </p>
            )}
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
