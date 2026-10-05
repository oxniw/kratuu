// ==============================================================================
// File: .//Description-of-file/category_drawer.md
// Overview: Left slide-out navigation drawer displaying the hierarchical board directory.
// ==============================================================================

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { BOARD_DIRECTORY, BoardItem } from "@/lib/categories";
import { X, Search, Hash, ArrowUpRight } from "lucide-react";

interface CategoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CategoryDrawer({ isOpen, onClose }: CategoryDrawerProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filter boards based on search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return BOARD_DIRECTORY;

    return BOARD_DIRECTORY.map((group) => {
      const matchingBoards = group.boards.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.enName.toLowerCase().includes(q) ||
          b.slug.toLowerCase().includes(q)
      );
      return {
        ...group,
        boards: matchingBoards,
      };
    }).filter((group) => group.boards.length > 0);
  }, [searchQuery]);

  const handleSelectBoard = (board: BoardItem) => {
    onClose();
    router.push(`/?category=${encodeURIComponent(board.name)}`);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-start bg-black/60 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div className="w-full max-w-sm sm:max-w-md bg-white dark:bg-black text-black dark:text-white border-r border-black dark:border-white h-full flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="p-4 border-b border-black dark:border-white flex items-center justify-between">
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400 block">
              สารบัญห้องสนทนา
            </span>
            <h2 className="text-lg font-black font-mono tracking-tight uppercase">
              kratuu.boards
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
            title="ปิดเมนู (Esc)"
            aria-label="ปิดเมนู"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search input inside drawer */}
        <div className="p-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-3 text-neutral-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาห้องหรือหมวดหมู่ (เช่น photo, music, ศิลปะ)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs font-mono border border-black dark:border-white bg-transparent focus:outline-none placeholder:text-neutral-500"
              autoFocus
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 text-xs font-mono text-neutral-500 hover:text-black dark:hover:text-white px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Directory Groups List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 font-mono text-xs border border-dashed border-neutral-300 dark:border-neutral-800 p-4">
              ไม่พบห้องที่ตรงกับ &ldquo;{searchQuery}&rdquo;
            </div>
          ) : (
            filteredGroups.map((group) => (
              <section key={group.groupEnName} className="space-y-2">
                {/* Group Heading */}
                <div className="flex items-baseline justify-between border-b border-black dark:border-white pb-1">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-black dark:text-white">
                    {group.groupEnName}
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    {group.groupName}
                  </span>
                </div>

                {/* Boards List */}
                <div className="space-y-1 pt-1">
                  {group.boards.map((board) => (
                    <button
                      key={board.id}
                      onClick={() => handleSelectBoard(board)}
                      className="w-full text-left px-2.5 py-1.5 text-xs font-mono flex items-center justify-between group hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer border border-transparent hover:border-black dark:hover:border-white"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Hash className="w-3 h-3 text-neutral-400 group-hover:text-current shrink-0" />
                        <span className="font-semibold truncate">
                          {board.enName}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 group-hover:text-neutral-300 dark:group-hover:text-neutral-700 truncate">
                          ({board.name})
                        </span>
                      </div>
                      <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-black dark:border-white text-[11px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center justify-between bg-neutral-50 dark:bg-neutral-950">
          <span>รวม {BOARD_DIRECTORY.reduce((acc, g) => acc + g.boards.length, 0)} ห้องสนทนา</span>
          <button
            onClick={() => {
              onClose();
              router.push("/");
            }}
            className="hover:underline text-black dark:text-white font-bold"
          >
            ดูทุกห้อง (หน้าแรก)
          </button>
        </div>
      </div>

      {/* Backdrop click area */}
      <div className="flex-1" onClick={onClose} aria-hidden="true" />
    </div>
  );
}
