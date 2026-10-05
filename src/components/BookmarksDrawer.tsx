// ==============================================================================
// File: .//Description-of-file/bookmarks_drawer.md
// Overview: Drawer panel displaying saved thread bookmarks and recently viewed threads.
// ==============================================================================

"use client"; // Enable client-side execution

import React, { useEffect, useState } from "react"; // Import React core hooks
import Link from "next/link"; // Import Next Link component
import { useRouter } from "next/navigation"; // Import Next router hook for navigation
import { getBookmarks, getRecentViews, toggleBookmark, BookmarkedThread, RecentThread } from "@/lib/storage"; // Import storage helpers and types
import { useAuthGuard } from "@/hooks/useAuthGuard"; // Import authentication gate hook
import { X, Bookmark, Clock, Trash2 } from "lucide-react"; // Import UI icons

interface BookmarksDrawerProps { // Define props interface
  isOpen: boolean; // Drawer open boolean state
  onClose: () => void; // Close drawer callback
} // End BookmarksDrawerProps

export default function BookmarksDrawer({ isOpen, onClose }: BookmarksDrawerProps) { // Define BookmarksDrawer component
  const router = useRouter(); // Initialize router instance
  const { requireAuth } = useAuthGuard(); // Destructure requireAuth from authentication guard
  const [activeTab, setActiveTab] = useState<"bookmarks" | "recents">("bookmarks"); // Active tab state
  const [bookmarks, setBookmarks] = useState<BookmarkedThread[]>([]); // Bookmarked threads list state
  const [recents, setRecents] = useState<RecentThread[]>([]); // Recent threads list state

  const reloadData = () => {
    setBookmarks(getBookmarks());
    setRecents(getRecentViews());
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRemoveBookmark = (e: React.MouseEvent, item: BookmarkedThread) => {
    e.preventDefault();
    e.stopPropagation();
    toggleBookmark(item);
    reloadData();
  };

  const handleClearRecents = () => { // Clear all stored recent views
    localStorage.removeItem("kratuu_recents"); // Remove key from localStorage
    window.dispatchEvent(new Event("kratuu_storage_updated")); // Notify listeners of storage change
    reloadData(); // Refresh local list
  }; // End handleClearRecents

  const handleOpenThread = (e: React.MouseEvent, threadId: string) => { // Guard navigation to bookmarked or recent thread
    e.preventDefault(); // Prevent direct navigation
    requireAuth(() => { // Enforce user login prior to opening thread
      onClose(); // Close the drawer panel
      router.push(`/thread/${threadId}`); // Navigate to thread detail
    }, "ดูเนื้อหากระทู้"); // Custom action prompt
  }; // End handleOpenThread

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-[2px]">
      <div className="w-full max-w-md bg-white dark:bg-black text-black dark:text-white border-l border-black dark:border-white h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-black dark:border-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-tight text-lg">คลังกระทู้ส่วนตัว</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black dark:border-white">
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`flex-1 py-2.5 text-center text-sm font-mono border-r border-black dark:border-white flex items-center justify-center gap-1.5 ${
              activeTab === "bookmarks"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>ที่คั่นหน้า ({bookmarks.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("recents")}
            className={`flex-1 py-2.5 text-center text-sm font-mono flex items-center justify-center gap-1.5 ${
              activeTab === "recents"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>เข้าชมล่าสุด ({recents.length})</span>
          </button>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {activeTab === "bookmarks" ? (
            bookmarks.length === 0 ? (
              <div className="py-12 text-center text-neutral-500 font-mono text-sm border border-dashed border-neutral-400 dark:border-neutral-700 p-4">
                ยังไม่มีกระทู้ที่คั่นหน้าไว้
                <p className="text-xs mt-1 text-neutral-400">กดไอคอนบุ๊กมาร์กที่กระทู้เพื่อเก็บไว้อ่านภายหลัง</p>
              </div>
            ) : (
              bookmarks.map((b) => (
                <div
                  key={b.id}
                  className="group border border-black dark:border-white p-3 flex items-start justify-between gap-3 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors"
                >
                  <Link
                    href={`/thread/${b.id}`} // Target thread path
                    onClick={(e) => handleOpenThread(e, b.id)} // Guard navigation with auth check
                    className="flex-1 block text-decoration-none" // Layout styling
                  >
                    <span className="text-xs font-mono border border-black dark:border-white px-1 mr-2 inline-block">
                      {b.category}
                    </span>
                    <span className="font-medium text-sm hover:underline line-clamp-2 mt-1 break-words [overflow-wrap:anywhere]">
                      {b.title}
                    </span>
                  </Link>
                  <button
                    onClick={(e) => handleRemoveBookmark(e, b)}
                    className="p-1 border border-transparent hover:border-black dark:hover:border-white text-neutral-500 hover:text-black dark:hover:text-white"
                    title="ลบออกจากที่คั่นหน้า"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )
          ) : recents.length === 0 ? (
            <div className="py-12 text-center text-neutral-500 font-mono text-sm border border-dashed border-neutral-400 dark:border-neutral-700 p-4">
              ยังไม่มีประวัติการเข้าชม
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex justify-end mb-2">
                <button
                  onClick={handleClearRecents}
                  className="text-xs font-mono text-neutral-500 hover:text-black dark:hover:text-white underline"
                >
                  [ล้างประวัติ]
                </button>
              </div>
              {recents.map((r) => (
                <Link
                  key={r.id} // Unique item key
                  href={`/thread/${r.id}`} // Target thread path
                  onClick={(e) => handleOpenThread(e, r.id)} // Guard navigation with auth check
                  className="block border border-black dark:border-white p-3 hover:bg-neutral-50 dark:hover:bg-neutral-950 transition-colors text-decoration-none" // Layout styling
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono border border-black dark:border-white px-1">
                      {r.category}
                    </span>
                  </div>
                  <p className="font-medium text-sm hover:underline line-clamp-2 mt-1 break-words [overflow-wrap:anywhere]">
                    {r.title}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
