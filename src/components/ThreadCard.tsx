// ==============================================================================
// File: .//Description-of-file/thread_card.md
// Overview: Thread list item card displaying votes, metrics, tags, and bookmark toggle.
// ==============================================================================

"use client";

import React, { useState, useEffect } from "react"; // Import React core hooks
import Link from "next/link"; // Import Next Link component
import { useRouter } from "next/navigation"; // Import Next router hook for guarded navigation
import { Thread } from "@/types"; // Import Thread type
import { toggleBookmark, isBookmarked } from "@/lib/storage"; // Import bookmark storage utilities
import { useAuthGuard } from "@/hooks/useAuthGuard"; // Import authentication gate hook
import { MessageSquare, Eye, Bookmark, ChevronUp, ChevronDown } from "lucide-react"; // Import UI icons

interface ThreadCardProps { // Define ThreadCard props interface
  thread: Thread; // Thread data object
  onTagClick?: (tag: string) => void; // Optional tag click callback
} // End ThreadCardProps

export default function ThreadCard({ thread, onTagClick }: ThreadCardProps) { // Define ThreadCard component
  const router = useRouter(); // Initialize router instance for navigation
  const { requireAuth } = useAuthGuard(); // Destructure requireAuth from authentication guard
  const [upvotes, setUpvotes] = useState(thread.upvotes); // Upvotes state
  const [downvotes, setDownvotes] = useState(thread.downvotes); // Downvotes state
  const [userVote, setUserVote] = useState<1 | -1 | 0>(thread.user_vote ?? 0); // User vote state
  const [bookmarked, setBookmarked] = useState(() => isBookmarked(thread.id)); // Bookmarked state

  // Sync state if thread prop updates
  useEffect(() => {
    setUpvotes(thread.upvotes);
    setDownvotes(thread.downvotes);
    setUserVote(thread.user_vote ?? 0);
  }, [thread.upvotes, thread.downvotes, thread.user_vote]);

  const score = upvotes - downvotes;

  const handleVote = (type: 1 | -1) => {
    requireAuth(async () => {
      try {
        const res = await fetch("/api/vote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_id: thread.id,
            target_type: "thread",
            vote_type: type,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setUpvotes(data.upvotes);
          setDownvotes(data.downvotes);
          setUserVote(data.userVote);
        }
      } catch (err) {
        console.error("Vote failed:", err);
      }
    }, type === 1 ? "vote up" : "vote down");
  };

  const handleBookmark = (e: React.MouseEvent) => { // Handle bookmarking thread
    e.preventDefault(); // Prevent default link navigation
    e.stopPropagation(); // Stop event bubbling
    requireAuth(() => { // Gate bookmarking behind authentication
      const active = toggleBookmark({ // Toggle bookmark storage
        id: thread.id, // Thread id
        title: thread.title, // Thread title
        category: thread.category, // Thread category
      }); // End toggleBookmark
      setBookmarked(active); // Update local bookmark state
    }, "บันทึกกระทู้"); // Action prompt
  }; // End handleBookmark

  const handleThreadClick = (e: React.MouseEvent) => { // Handle clicking to view thread details
    e.preventDefault(); // Prevent direct unauthenticated navigation
    requireAuth(() => { // Enforce authentication before redirecting to thread
      router.push(`/thread/${thread.id}`); // Navigate to thread detail page
    }, "ดูเนื้อหากระทู้"); // Action description prompt
  }; // End handleThreadClick

  // Format relative time in Thai
  const formatTime = (ms: number) => { // Calculate relative timestamp string
    const diff = Math.floor((Date.now() - ms) / 1000); // Difference in seconds
    if (diff < 60) return "เมื่อสักครู่"; // Less than one minute
    if (diff < 3600) return `${Math.floor(diff / 60)} น. ที่แล้ว`; // Less than one hour
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`; // Less than one day
    return `${Math.floor(diff / 86400)} วันที่แล้ว`; // Days ago
  }; // End formatTime

  return ( // Render ThreadCard component
    <article className="border border-black dark:border-white bg-white dark:bg-black p-4 transition-all hover:translate-x-[2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Vote Column */}
        <div className="flex flex-col items-center border border-black dark:border-white p-1 text-xs font-mono min-w-[38px] select-none">
          <button
            onClick={() => handleVote(1)}
            className={`p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${
              userVote === 1 ? "bg-black text-white dark:bg-white dark:text-black font-bold" : ""
            }`}
            title="เห็นด้วย / โหวตขึ้น"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <span className="my-1 font-bold">{score}</span>
          <button
            onClick={() => handleVote(-1)}
            className={`p-1 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${
              userVote === -1 ? "bg-black text-white dark:bg-white dark:text-black font-bold" : ""
            }`}
            title="โหวตลง"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content Column */}
        <div className="flex-1 min-w-0">
          {/* Header metadata */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono mb-1 text-neutral-600 dark:text-neutral-400">
            <span className="border border-black dark:border-white px-1.5 py-0.5 text-black dark:text-white font-semibold">
              {thread.category}
            </span>
            <span>โดย {thread.author_name}</span>
            <span>•</span>
            <span>{formatTime(thread.created_at)}</span>
          </div>

          {/* Title */}
          <h2 className="text-base sm:text-lg font-bold leading-snug my-1 break-words [overflow-wrap:anywhere]">
            <Link
              href={`/thread/${thread.id}`}
              onClick={handleThreadClick}
              className="hover:underline text-black dark:text-white block break-words [overflow-wrap:anywhere]"
            >
              {thread.title}
            </Link>
          </h2>

          {/* Short preview snippet */}
          <p
            onClick={handleThreadClick}
            className="text-sm text-neutral-700 dark:text-neutral-300 line-clamp-2 mb-3 cursor-pointer hover:opacity-80 transition-opacity"
            title="คลิกเพื่อเข้าดูเนื้อหากระทู้"
          >
            {thread.content.replace(/[#*`_>]/g, "")}
          </p>

          {/* Footer tags and counters */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs font-mono">
            {/* Tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              {thread.tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => onTagClick && onTagClick(tag)}
                  className="px-1.5 py-0.5 border border-neutral-400 dark:border-neutral-600 hover:border-black dark:hover:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>

            {/* Metrics & Bookmark */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleThreadClick}
                className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                title="จำนวนความคิดเห็น (คลิกเพื่อเข้าดู)"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>{thread.comment_count ?? 0}</span>
              </button>
              <span className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400" title="ยอดเข้าชม">
                <Eye className="w-3.5 h-3.5" />
                <span>{thread.views}</span>
              </span>
              <button
                onClick={handleBookmark}
                className={`p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${
                  bookmarked ? "bg-black text-white dark:bg-white dark:text-black" : ""
                }`}
                title={bookmarked ? "ลบที่คั่นหน้า" : "บันทึกกระทู้"}
              >
                <Bookmark className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
