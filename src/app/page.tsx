// ==============================================================================
// File: .//Description-of-file/home_page.md
// Overview: Main entry page serving the 4chan-style directory landing view, with MISC -> Board housing the thread feed.
// ==============================================================================

"use client"; // Enable React Client Component features

import React, { useEffect, useState, useCallback, Suspense } from "react"; // Import React core hooks and Suspense
import { useRouter, useSearchParams } from "next/navigation"; // Import Next.js navigation hooks
import Link from "next/link"; // Import Link component for client-side routing
import Header from "@/components/Header"; // Import global header component
import FilterBar from "@/components/FilterBar"; // Import filter and search toolbar
import ThreadCard from "@/components/ThreadCard"; // Import individual thread item component
import BookmarksDrawer from "@/components/BookmarksDrawer"; // Import bookmarks drawer component
import DirectoryLanding from "@/components/DirectoryLanding"; // Import 4chan-styled directory landing component
import { Thread } from "@/types"; // Import Thread TypeScript interface
import { useAuthGuard } from "@/hooks/useAuthGuard"; // Import authentication guard hook
import { findBoard } from "@/lib/categories"; // Import category lookup helper
import { PenLine, RefreshCw, ArrowLeft, LayoutGrid } from "lucide-react"; // Import UI icons

function HomeContent() { // Inner content component wrapped in Suspense for useSearchParams
  const router = useRouter(); // Initialize router instance for navigation
  const searchParams = useSearchParams(); // Read URL search query parameters
  const categoryParam = searchParams.get("category"); // Extract active category filter parameter
  const { isAuthenticated, requireAuth } = useAuthGuard(); // Initialize auth guard state and helper
  const [threads, setThreads] = useState<Thread[]>([]); // Store list of fetched threads
  const [loading, setLoading] = useState(true); // Track loading indicator state
  const [drawerOpen, setDrawerOpen] = useState(false); // Track bookmarks drawer visibility

  // Filter and sort states for the thread feed
  const [sort, setSort] = useState("latest"); // Active sorting option
  const [searchQuery, setSearchQuery] = useState(""); // User search input query
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // Active tag filter

  // Check if we are viewing a specific board or the main Board feed
  const isBoardView = Boolean(categoryParam); // True if user is viewing a board feed
  const isMainBoard = categoryParam?.toLowerCase() === "board"; // True if user navigated to MISC -> Board

  // Resolve board information if a category is selected
  const matchedBoard = categoryParam ? findBoard(categoryParam) : null; // Find board details from category directory
  const bannerTitle = isMainBoard // Compute uppercase banner title
    ? "KRATUU . BOARD" // Special title for main Board feed
    : matchedBoard // Check if matched registered board
    ? `KRATUU . ${matchedBoard.board.enName.toUpperCase()}` // Show English board name if matched
    : categoryParam // Check if raw category name is present
    ? `KRATUU . ${categoryParam.toUpperCase()}` // Show uppercase raw category name
    : "KRATUU.BOARD"; // Default fallback title

  const bannerTagline = isMainBoard // Compute banner top tagline
    ? "ห้องสนทนา • MISC. • Board (กระดานรวมข้อความล้วน)" // Tagline for main Board
    : matchedBoard // Check if matched registered board
    ? `ห้องสนทนา • ${matchedBoard.group.groupEnName} • ${matchedBoard.board.name}` // Show group and Thai board name
    : categoryParam // Check if raw category name is present
    ? `ห้องสนทนา • หมวดหมู่ ${categoryParam}` // Show raw category tag
    : "ฉบับอิสระ • แพลตฟอร์มสนทนาข้อความล้วน"; // Default tagline

  const bannerDescription = isMainBoard // Compute banner subtitle description
    ? "กระดานสนทนารวมทุกหัวข้อ สองสีขาว-ดำ โฟกัสที่สาระและบทสนทนา ปราศจากสิ่งรบกวน" // Description for main Board
    : matchedBoard // Check if matched registered board
    ? `พื้นที่แลกเปลี่ยนความคิดเห็นเฉพาะห้อง ${matchedBoard.board.name} (${matchedBoard.board.enName}) โฟกัสที่สาระและบทสนทนา` // Specific board description
    : categoryParam // Check if raw category name is present
    ? `พื้นที่แลกเปลี่ยนความคิดเห็นในห้อง ${categoryParam} ปราศจากสิ่งรบกวน` // Raw category description
    : "พื้นที่แลกเปลี่ยนความคิดเห็น สองสีขาว-ดำ โฟกัสที่สาระและบทสนทนา ปราศจากสิ่งรบกวน"; // Default platform description

  const newThreadHref = categoryParam // Determine target href for thread creation button
    ? `/new?category=${encodeURIComponent(categoryParam)}` // Link to new thread with pre-selected category
    : "/new"; // Standard new thread link

  const handleBannerNewThread = (e: React.MouseEvent) => { // Handle click on banner new thread button
    if (!isAuthenticated) { // Check if current user is unauthenticated
      e.preventDefault(); // Stop default anchor link navigation
      const actionName = categoryParam ? "ตั้งกระทู้ในห้องนี้" : "ตั้งกระทู้ใหม่"; // Set action prompt message
      requireAuth(() => router.push(newThreadHref), actionName); // Trigger sign in requirement prompt
    } // End unauthenticated check
  }; // End handleBannerNewThread

  const handleEmptyStateNewThread = (e: React.MouseEvent) => { // Handle click on empty state first thread button
    if (!isAuthenticated) { // Check if current user is unauthenticated
      e.preventDefault(); // Stop default anchor link navigation
      const actionName = categoryParam ? "เขียนกระทู้แรกในห้องนี้" : "เขียนกระทู้แรก"; // Set action prompt message
      requireAuth(() => router.push(newThreadHref), actionName); // Trigger sign in requirement prompt
    } // End unauthenticated check
  }; // End handleEmptyStateNewThread

  const fetchThreads = useCallback(async () => { // Fetch threads from backend API with active filters
    if (!isBoardView) return; // Do not fetch threads if on directory landing view
    try { // Begin fetch try block
      setLoading(true); // Turn on loading spinner
      const params = new URLSearchParams(); // Construct URL search parameters
      if (sort) params.set("sort", sort); // Append sort parameter
      if (searchQuery.trim()) params.set("q", searchQuery.trim()); // Append search query parameter
      if (selectedTag) params.set("tag", selectedTag); // Append tag filter parameter
      if (categoryParam) params.set("category", categoryParam); // Append category filter parameter

      const res = await fetch(`/api/threads?${params.toString()}`); // Request threads from server API
      if (res.ok) { // Check if response status is successful
        const data = await res.json(); // Parse response JSON body
        setThreads(data.threads || []); // Set threads list in state
      } // End response check
    } catch (err) { // Handle network or fetch exceptions
      console.error("Failed to fetch threads:", err); // Log error to console
    } finally { // Finalize fetch execution
      setLoading(false); // Turn off loading spinner
    } // End finally block
  }, [isBoardView, sort, searchQuery, selectedTag, categoryParam]); // Re-create fetchThreads when filters change

  useEffect(() => { // Debounce fetch invocation on filter changes
    if (!isBoardView) return; // Skip effect on directory landing view
    const timer = setTimeout(() => { // Set debounce timer of 200 milliseconds
      fetchThreads(); // Execute fetchThreads
    }, 200); // Wait 200ms
    return () => clearTimeout(timer); // Clean up active timer on unmount or deps change
  }, [isBoardView, fetchThreads]); // Re-run effect when fetchThreads changes

  // Extract all available tags across current threads
  const availableTags = Array.from( // Collect unique tags array
    new Set(threads.flatMap((t) => t.tags || [])) // Flatten thread tags into unique Set
  ).slice(0, 10); // Limit to top 10 tags

  return ( // Render main component markup
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col">
      <Header onOpenDrawer={() => setDrawerOpen(true)} />
      <BookmarksDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 sm:py-8">
        {!isBoardView ? ( // Condition: If on root page without category param, display new directory landing layout
          <DirectoryLanding />
        ) : ( // Condition: If category param is present (e.g. MISC -> Board or specific category), display old landing page
          <div className="space-y-6">
            {/* Top Navigation Bar back to Directory */}
            <div className="flex items-center justify-between border-b border-black dark:border-white pb-3">
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>สารบัญ Boards (Directory)</span>
              </Link>

              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-neutral-500 hidden sm:inline">
                  {matchedBoard ? `หมวดหมู่: ${matchedBoard.group.groupEnName}` : "กระดานรวม"}
                </span>
                <Link
                  href="/"
                  className="p-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  title="กลับสู่หน้าสารบัญรวม"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Editorial Sub-banner (Old Landing Page Header) */}
            <section className="border border-black dark:border-white p-6 sm:p-8 bg-white dark:bg-black">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-mono uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                    {bannerTagline}
                  </p>
                  <h1 className="text-2xl sm:text-4xl font-black font-mono tracking-tight uppercase">
                    {bannerTitle}
                  </h1>
                  <p className="text-sm font-sans mt-2 max-w-lg text-neutral-700 dark:text-neutral-300">
                    {bannerDescription}
                  </p>
                </div>

                <Link
                  href={newThreadHref}
                  onClick={handleBannerNewThread}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-mono text-xs uppercase font-bold hover:opacity-85 transition-opacity whitespace-nowrap self-start sm:self-end"
                >
                  <PenLine className="w-3.5 h-3.5" />
                  <span>{isMainBoard ? "+ ตั้งกระทู้ใหม่" : "+ ตั้งกระทู้ในห้องนี้"}</span>
                </Link>
              </div>
            </section>

            {/* Filter & Search Bar */}
            <FilterBar
              sort={sort}
              onSortChange={setSort}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedTag={selectedTag}
              onTagSelect={setSelectedTag}
              availableTags={availableTags.length > 0 ? availableTags : ["เทคโนโลยี", "ชีวิต", "บทสนทนา"]}
            />

            {/* Thread Feed */}
            <div className="space-y-4">
              {loading ? (
                <div className="py-20 text-center font-mono text-sm flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>กำลังดึงรายการกระทู้...</span>
                </div>
              ) : threads.length === 0 ? (
                <div className="border border-black dark:border-white p-12 text-center font-mono space-y-4">
                  <p className="text-base font-bold">
                    {isMainBoard
                      ? "ยังไม่มีกระทู้ในระบบ"
                      : `ไม่พบกระทู้ในห้อง "${matchedBoard?.board.name || categoryParam}"`}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {isMainBoard
                      ? "ร่วมเป็นคนแรกที่เปิดประเด็นการสนทนา"
                      : searchQuery || selectedTag
                      ? "ลองเปลี่ยนคำค้นหา หรือล้างการกรองแท็ก"
                      : "ยังไม่มีกระทู้ในห้องนี้ ร่วมเป็นคนแรกที่เปิดประเด็น"}
                  </p>
                  <div className="pt-2">
                    <Link
                      href={newThreadHref}
                      onClick={handleEmptyStateNewThread}
                      className="inline-block px-4 py-2 border border-black dark:border-white text-xs hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                    >
                      {isMainBoard ? "+ เขียนกระทู้แรก" : "+ เขียนกระทู้แรกในห้องนี้"}
                    </Link>
                  </div>
                </div>
              ) : (
                threads.map((thread) => (
                  <ThreadCard
                    key={thread.id}
                    thread={thread}
                    onTagClick={(tag) => setSelectedTag(tag)}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* Swiss Minimal Footer */}
      <footer className="border-t border-black dark:border-white py-6 mt-12 bg-white dark:bg-black text-xs font-mono text-center text-neutral-500 dark:text-neutral-400">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>kratuu • minimalist monochrome webboard</span>
          <span>สร้างขึ้นด้วย Next.js & Tailwind CSS</span>
        </div>
      </footer>
    </div>
  ); // End render
} // End HomeContent

export default function HomePage() { // Default exported page component with Suspense boundary
  return ( // Render Suspense boundary wrapping HomeContent
    <Suspense // Provide fallback UI for Next.js searchParams prerendering
      fallback={
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center font-mono text-sm">
          กำลังโหลด...
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  ); // End render
} // End HomePage
