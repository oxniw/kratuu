// ==============================================================================
// File: .//Description-of-file/directory_landing.md
// Overview: Classic bulletin-board directory landing page layout with "What is kratuu?" banner and category columns.
// ==============================================================================

"use client"; // Enable React Client Component features

import React, { useState } from "react"; // Import React core hooks
import Link from "next/link"; // Import Next.js Link component
import { BOARD_DIRECTORY, BoardItem } from "@/lib/categories"; // Import categories directory registry
import { X, Search, ChevronDown, ChevronUp, BookOpen, HelpCircle } from "lucide-react"; // Import UI icons

interface DirectoryLandingProps { // Contract for landing page component
  onSelectBoard?: (boardName: string) => void; // Optional callback when a board link is clicked
} // End DirectoryLandingProps

export default function DirectoryLanding({ onSelectBoard }: DirectoryLandingProps) { // Renders classic directory landing page
  const [showWhatIs, setShowWhatIs] = useState(true); // Toggle visibility for "What is kratuu?" box
  const [filterOpen, setFilterOpen] = useState(false); // Toggle visibility for quick board filter input
  const [filterText, setFilterText] = useState(""); // Filter search query text
  const [activeModal, setActiveModal] = useState<"rules" | "faq" | null>(null); // State controlling Rules/FAQ popup modal

  const cleanFilter = filterText.trim().toLowerCase(); // Normalize filter string

  return ( // Render landing page structure
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans">
      {/* 1. Top Section: "What is kratuu?" box */}
      {showWhatIs ? ( // Render top banner box when active
        <section className="border-2 border-[#800000] dark:border-[#a83232] bg-[#fdfaf7] dark:bg-[#161212] shadow-sm">
          {/* Title Header Bar */}
          <div className="bg-[#800000] dark:bg-[#680000] text-white px-3 py-1.5 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold tracking-tight">
              What is kratuu?
            </h2>
            <button
              onClick={() => setShowWhatIs(false)} // Dismiss banner
              className="p-0.5 hover:bg-black/25 text-white transition-colors cursor-pointer"
              title="Close banner"
              aria-label="Close What is kratuu banner"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Description Content */}
          <div className="p-4 sm:p-5 text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 space-y-3 leading-relaxed">
            <p>
              kratuu is a simple bulletin board where anyone can post comments and share discussions.
              There are boards dedicated to a variety of topics, from Japanese animation and culture
              to videogames, music, and photography. Users do not need to register an account before
              participating in the community. Feel free to click on a board below that interests you
              and jump right in!
            </p>
            <p className="text-xs text-neutral-700 dark:text-neutral-300">
              Be sure to familiarize yourself with the{" "}
              <button
                type="button"
                onClick={() => setActiveModal("rules")}
                className="text-[#0000ee] dark:text-[#6c9eff] underline font-medium hover:text-[#d00] cursor-pointer"
              >
                Rules
              </button>{" "}
              before posting, and read the{" "}
              <button
                type="button"
                onClick={() => setActiveModal("faq")}
                className="text-[#0000ee] dark:text-[#6c9eff] underline font-medium hover:text-[#d00] cursor-pointer"
              >
                FAQ
              </button>{" "}
              if you wish to learn more about how to use the site.
            </p>
          </div>
        </section>
      ) : ( // Show restore banner trigger if dismissed
        <div className="flex justify-end">
          <button
            onClick={() => setShowWhatIs(true)}
            className="text-xs font-mono text-[#800000] dark:text-[#ff9999] hover:underline cursor-pointer"
          >
            [Show &ldquo;What is kratuu?&rdquo;]
          </button>
        </div>
      )}

      {/* 2. Main Section: "Boards" directory box */}
      <section className="border-2 border-[#800000] dark:border-[#a83232] bg-[#fbf5ee] dark:bg-[#141111] shadow-sm">
        {/* Title Header Bar */}
        <div className="bg-[#edd6bd] dark:bg-[#2d1f1f] text-[#800000] dark:text-[#ffb3b3] border-b-2 border-[#800000] dark:border-[#a83232] px-3 py-1.5 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            Boards
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen((prev) => !prev)}
              className="text-xs font-mono font-semibold flex items-center gap-1 hover:underline cursor-pointer text-[#800000] dark:text-[#ffb3b3]"
              title="Filter boards"
            >
              <span>filter</span>
              {filterOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Search Bar */}
        {filterOpen && (
          <div className="p-2.5 bg-[#f5e4d2] dark:bg-[#221717] border-b border-[#800000]/30 dark:border-[#a83232]/30 flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-500 shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search or filter boards (e.g. board, anime, photo)..."
              className="w-full text-xs font-mono bg-white dark:bg-black text-black dark:text-white border border-[#800000]/40 px-2 py-1 focus:outline-none"
              autoFocus
            />
            {filterText && (
              <button
                onClick={() => setFilterText("")}
                className="text-xs font-mono text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Multi-Column Categories Layout */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-4 items-start">
          {BOARD_DIRECTORY.map((group) => {
            const matchingBoards = cleanFilter
              ? group.boards.filter(
                  (b) =>
                    b.enName.toLowerCase().includes(cleanFilter) ||
                    b.name.toLowerCase().includes(cleanFilter) ||
                    b.slug.toLowerCase().includes(cleanFilter)
                )
              : group.boards;

            if (matchingBoards.length === 0) return null;

            const isMiscGroup = group.groupEnName.toUpperCase() === "MISC.";

            return (
              <div key={group.groupEnName} className="space-y-2 min-w-0">
                {/* Underlined Category Heading */}
                <div className="border-b border-[#800000] dark:border-[#a83232] pb-0.5">
                  <h3
                    className={`text-xs font-bold uppercase tracking-wider ${
                      isMiscGroup
                        ? "text-[#800000] dark:text-[#ff8080]"
                        : "text-[#800000] dark:text-[#ff9999]"
                    }`}
                  >
                    {group.groupEnName}
                  </h3>
                </div>

                {/* Board Links List */}
                <ul className="space-y-1 text-xs leading-tight">
                  {matchingBoards.map((b: BoardItem) => {
                    const isBoardItem = b.slug === "board" || b.id === "board";
                    const targetHref = `/?category=${encodeURIComponent(b.name)}`;

                    return (
                      <li key={b.id} className="truncate">
                        <Link
                          href={targetHref}
                          onClick={() => onSelectBoard && onSelectBoard(b.name)}
                          className={`inline-block transition-colors ${
                            isBoardItem
                              ? "font-bold text-[#800000] dark:text-[#ff8080] underline hover:text-[#d00] dark:hover:text-white bg-[#ebd2b6]/40 dark:bg-white/10 px-1 py-0.5 rounded-sm"
                              : "text-[#34345c] dark:text-[#d4d4f7] hover:text-[#d00] dark:hover:text-[#ff9999] hover:underline"
                          }`}
                          title={`${b.enName} (${b.name})`}
                        >
                          {b.enName}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </section>

      {/* 3. Rules & FAQ Interactive Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[1px] p-4">
          <div className="bg-[#fdfaf7] dark:bg-[#161212] border-2 border-[#800000] dark:border-[#a83232] max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-neutral-900 dark:text-neutral-100 flex flex-col max-h-[85vh]">
            <div className="bg-[#800000] dark:bg-[#680000] text-white px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeModal === "rules" ? <BookOpen className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider">
                  {activeModal === "rules" ? "Community Rules" : "Frequently Asked Questions"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="hover:bg-black/25 p-1 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm leading-relaxed">
              {activeModal === "rules" ? (
                <>
                  <p className="font-bold">Please respect the following basic guidelines:</p>
                  <ol className="list-decimal list-inside space-y-2 text-neutral-800 dark:text-neutral-200">
                    <li>Do not post illegal content or material that violates local regulations.</li>
                    <li>Avoid spamming, commercial flooding, or repeating duplicate threads across boards.</li>
                    <li>Be civil in discussion and avoid targeted harassment or malicious doxxing.</li>
                    <li>Categorize threads in their appropriate boards to keep discussions organized.</li>
                    <li>Optional 4-digit PINs protect guest threads for author deletion. Keep your PIN safe.</li>
                  </ol>
                </>
              ) : (
                <>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-bold text-[#800000] dark:text-[#ff9999]">Do I need an account to post?</h4>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        No. You can post and comment anonymously with a display name and an optional PIN. Creating an account lets you manage your username and profile.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#800000] dark:text-[#ff9999]">Where is the full thread feed?</h4>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        Click on <strong>MISC. &rarr; Board</strong> to open the full thread feed (the original landing page).
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold text-[#800000] dark:text-[#ff9999]">Can I use Markdown formatting?</h4>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        Yes. Bold, italics, code blocks, bullet lists, blockquotes, and links are supported across thread contents and comments.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 border-t border-[#800000]/20 dark:border-[#a83232]/20 flex justify-end bg-[#f3ebe1] dark:bg-[#1e1717]">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1 text-xs font-mono font-bold bg-[#800000] text-white hover:opacity-90 transition-opacity cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  ); // End render
} // End DirectoryLanding
