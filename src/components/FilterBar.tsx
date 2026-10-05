// ==============================================================================
// File: .//Description-of-file/filter_bar.md
// Overview: Search input, sort tabs (Latest/Top/Comments), and tag filter chips.
// ==============================================================================

"use client";

import React from "react";
import { Search, X, Flame, Clock, MessageSquare } from "lucide-react";

interface FilterBarProps {
  sort: string;
  onSortChange: (sort: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedTag: string | null;
  onTagSelect: (tag: string | null) => void;
  availableTags: string[];
}

export default function FilterBar({
  sort,
  onSortChange,
  searchQuery,
  onSearchChange,
  selectedTag,
  onTagSelect,
  availableTags,
}: FilterBarProps) {
  return (
    <div className="space-y-3 mb-6">
      {/* Top row: Search input and Sort selector */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-between">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="ค้นหากระทู้ หรือ เนื้อหา..."
            className="w-full pl-9 pr-9 py-2 border border-black dark:border-white bg-transparent text-sm font-mono placeholder:text-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-neutral-500 hover:text-black dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort Tabs */}
        <div className="flex border border-black dark:border-white text-xs font-mono">
          <button
            onClick={() => onSortChange("latest")}
            className={`flex items-center gap-1.5 px-3 py-2 border-r border-black dark:border-white transition-colors ${
              sort === "latest"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ล่าสุด</span>
          </button>
          <button
            onClick={() => onSortChange("top")}
            className={`flex items-center gap-1.5 px-3 py-2 border-r border-black dark:border-white transition-colors ${
              sort === "top"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>ยอดนิยม</span>
          </button>
          <button
            onClick={() => onSortChange("comments")}
            className={`flex items-center gap-1.5 px-3 py-2 transition-colors ${
              sort === "comments"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>คุยเยอะ</span>
          </button>
        </div>
      </div>

      {/* Tag filters row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-mono scrollbar-none">
        <button
          onClick={() => onTagSelect(null)}
          className={`px-2.5 py-1 border whitespace-nowrap transition-colors ${
            selectedTag === null
              ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-bold"
              : "border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white"
          }`}
        >
          ทั้งหมด
        </button>
        {availableTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagSelect(selectedTag === tag ? null : tag)}
            className={`px-2.5 py-1 border whitespace-nowrap transition-colors ${
              selectedTag === tag
                ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-bold"
                : "border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}
