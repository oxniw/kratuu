// ==============================================================================
// File: .//Description-of-file/directory_landing.md
// Overview: Pure black and white Swiss-minimalist bulletin board directory landing page.
// ==============================================================================

"use client"; // Enable React Client Component features

import React, { useState } from "react"; // Import React core hooks
import Link from "next/link"; // Import Next.js Link component
import { BOARD_DIRECTORY, BoardItem } from "@/lib/categories"; // Import categories directory registry
import { X, Search, ChevronDown, ChevronUp, BookOpen, HelpCircle } from "lucide-react"; // Import UI icons

interface DirectoryLandingProps { // Contract for landing page component
  onSelectBoard?: (boardName: string) => void; // Optional callback when a board link is clicked
} // End DirectoryLandingProps

export default function DirectoryLanding({ onSelectBoard }: DirectoryLandingProps) { // Renders monochrome directory landing page
  const [showWhatIs, setShowWhatIs] = useState(true); // Toggle visibility for "What is kratuu?" box
  const [filterOpen, setFilterOpen] = useState(false); // Toggle visibility for quick board filter input
  const [filterText, setFilterText] = useState(""); // Filter search query text
  const [activeModal, setActiveModal] = useState<"rules" | "faq" | null>(null); // State controlling Rules/FAQ popup modal

  const cleanFilter = filterText.trim().toLowerCase(); // Normalize filter string

  return ( // Render landing page structure
    <div className="space-y-6 max-w-5xl mx-auto w-full font-sans text-black dark:text-white">
      {/* 1. Top Section: "What is kratuu?" box (pure black & white 2-color) */}
      {showWhatIs ? ( // Render top banner box when active
        <section className="border-2 border-black dark:border-white bg-white dark:bg-black">
          {/* Title Header Bar */}
          <div className="bg-black text-white dark:bg-white dark:text-black px-3 py-1.5 flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold font-mono uppercase tracking-tight">
              What is kratuu?
            </h2>
            <button
              onClick={() => setShowWhatIs(false)} // Dismiss banner
              className="p-0.5 hover:opacity-75 transition-opacity cursor-pointer"
              title="Close banner"
              aria-label="Close What is kratuu banner"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Description Content */}
          <div className="p-4 sm:p-5 text-xs sm:text-sm text-black dark:text-white space-y-3 leading-relaxed">
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
                className="underline font-bold hover:opacity-70 cursor-pointer text-black dark:text-white"
              >
                Rules
              </button>{" "}
              before posting, and read the{" "}
              <button
                type="button"
                onClick={() => setActiveModal("faq")}
                className="underline font-bold hover:opacity-70 cursor-pointer text-black dark:text-white"
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
            className="text-xs font-mono text-black dark:text-white underline hover:opacity-70 cursor-pointer"
          >
            [Show &ldquo;What is kratuu?&rdquo;]
          </button>
        </div>
      )}

      {/* 2. Main Section: "Boards" directory box (pure black & white 2-color) */}
      <section className="border-2 border-black dark:border-white bg-white dark:bg-black">
        {/* Title Header Bar */}
        <div className="bg-black text-white dark:bg-white dark:text-black border-b-2 border-black dark:border-white px-3 py-1.5 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black font-mono uppercase tracking-tight">
            Boards
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterOpen((prev) => !prev)}
              className="text-xs font-mono font-bold uppercase hover:underline cursor-pointer flex items-center gap-1"
              title="Filter boards"
            >
              <span>filter</span>
              {filterOpen ? <ChevronUp className="w-3.5 h-3.5 stroke-[2.5]" /> : <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />}
            </button>
          </div>
        </div>

        {/* Collapsible Filter Search Bar */}
        {filterOpen && (
          <div className="p-2.5 bg-neutral-50 dark:bg-neutral-900 border-b-2 border-black dark:border-white flex items-center gap-2">
            <Search className="w-4 h-4 text-black dark:text-white shrink-0" />
            <input
              type="text"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Search or filter boards (e.g. board, anime, photo)..."
              className="w-full text-xs font-mono bg-white dark:bg-black text-black dark:text-white border border-black dark:border-white px-2 py-1 focus:outline-none placeholder:text-neutral-500"
              autoFocus
            />
            {filterText && (
              <button
                onClick={() => setFilterText("")}
                className="text-xs font-mono text-black dark:text-white hover:opacity-70 px-1 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Multi-Column Categories Layout (Pure 2-Color Monochrome) */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-4 items-start bg-white dark:bg-black">
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

            return (
              <div key={group.groupEnName} className="space-y-2 min-w-0">
                {/* Underlined Category Heading */}
                <div className="border-b-2 border-black dark:border-white pb-1">
                  <h3 className="text-xs font-black font-mono uppercase tracking-wider text-black dark:text-white">
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
                          className={`inline-block transition-opacity ${
                            isBoardItem
                              ? "font-black font-mono underline bg-black text-white dark:bg-white dark:text-black px-1.5 py-0.5 border border-black dark:border-white"
                              : "text-black dark:text-white hover:underline hover:opacity-75"
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

      {/* 3. Rules & FAQ Interactive Modal (pure black & white 2-color) */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-[1px] p-4">
          <div className="bg-white dark:bg-black border-2 border-black dark:border-white max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-black dark:text-white flex flex-col max-h-[85vh]">
            <div className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {activeModal === "rules" ? <BookOpen className="w-4 h-4" /> : <HelpCircle className="w-4 h-4" />}
                <h3 className="text-sm font-bold uppercase font-mono tracking-wider">
                  {activeModal === "rules" ? "Community Rules" : "Frequently Asked Questions"}
                </h3>
              </div>
              <button
                onClick={() => setActiveModal(null)}
                className="hover:opacity-75 p-1 text-inherit cursor-pointer"
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
                      <h4 className="font-bold">Do I need an account to post?</h4>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        No. You can post and comment anonymously with a display name and an optional PIN. Creating an account lets you manage your username and profile.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold">Where is the full thread feed?</h4>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        Click on <strong>MISC. &rarr; Board</strong> to open the full thread feed (the original landing page).
                      </p>
                    </div>
                    <div>
                      <h4 className="font-bold">Can I use Markdown formatting?</h4>
                      <p className="text-neutral-700 dark:text-neutral-300">
                        Yes. Bold, italics, code blocks, bullet lists, blockquotes, and links are supported across thread contents and comments.
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 border-t-2 border-black dark:border-white flex justify-end bg-white dark:bg-black">
              <button
                onClick={() => setActiveModal(null)}
                className="px-4 py-1.5 text-xs font-mono font-bold uppercase bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white hover:opacity-80 transition-opacity cursor-pointer"
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
