// ==============================================================================
// File: .//Description-of-file/thread_detail_page.md
// Overview: Thread detail view with markdown rendering, nested discussions, voting, and access control.
// ==============================================================================

"use client"; // Enable client-side execution

import React, { useEffect, useState, use } from "react"; // Import React core hooks
import Link from "next/link"; // Import Next Link component
import { useRouter } from "next/navigation"; // Import Next router hook
import Header from "@/components/Header"; // Import global Header component
import BookmarksDrawer from "@/components/BookmarksDrawer"; // Import BookmarksDrawer component
import MarkdownRenderer from "@/components/MarkdownRenderer"; // Import markdown renderer
import MarkdownEditor from "@/components/MarkdownEditor"; // Import markdown editor
import { Thread, CommentItem } from "@/types"; // Import Thread and CommentItem types
import { addRecentView, toggleBookmark, isBookmarked, getStoredHandle, setStoredHandle } from "@/lib/storage"; // Import storage utilities
import { useAuth } from "@/hooks/useAuth"; // Import authentication hook
import { useAuthGuard } from "@/hooks/useAuthGuard"; // Import authentication guard hook
import { ArrowLeft, Bookmark, ChevronUp, ChevronDown, MessageSquare, Trash2, Reply, Eye, Clock, ShieldCheck, Lock, RefreshCw } from "lucide-react"; // Import UI icons

export default function ThreadDetailPage({ // Define ThreadDetailPage component
  params, // Dynamic parameters
}: {
  params: Promise<{ id: string }>; // Parameters promise interface
}) {
  const { id } = use(params); // Unwrap parameters promise
  const router = useRouter(); // Initialize router instance
  const { user, loading: authLoading } = useAuth(); // Consume user profile and loading flag
  const { isAuthenticated, requireAuth } = useAuthGuard(); // Consume authentication guard API

  const [thread, setThread] = useState<Thread | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Voting state
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [userVote, setUserVote] = useState<1 | -1 | 0>(0);
  const [bookmarked, setBookmarked] = useState(false);

  // Reply form state
  const [replyContent, setReplyContent] = useState("");
  const [replyAuthor, setReplyAuthor] = useState("");
  const [replyPin, setReplyPin] = useState("");
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleGoBack = () => { // Navigates back to the exact previous feed or board page where user arrived from
    if (typeof window !== "undefined") { // Check window environment
      const savedFeed = sessionStorage.getItem("kratuu_prev_feed"); // Retrieve recorded previous feed URL
      if (savedFeed && !savedFeed.includes(`/thread/${id}`)) { // Ensure saved feed is not the current thread URL
        router.push(savedFeed); // Return to recorded previous board feed directly
        return; // End execution
      } // End saved feed check
      if (window.history.length > 1) { // Fallback to browser history if available
        router.back(); // Navigate back in browser history
        return; // End execution
      } // End history check
    } // End window check
    router.push("/?category=Board"); // Default fallback to main Board feed
  }; // End handleGoBack

  const fetchThreadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/threads/${id}`);
      if (!res.ok) {
        throw new Error("ไม่พบกระทู้นี้ หรือกระทู้อาจถูกลบไปแล้ว");
      }
      const data = await res.json();
      setThread(data.thread);
      setComments(data.comments || []);
      setUpvotes(data.thread.upvotes);
      setDownvotes(data.thread.downvotes);
      setUserVote(data.thread.user_vote ?? 0);
      setBookmarked(isBookmarked(data.thread.id));

      // Record in recent views
      addRecentView({
        id: data.thread.id,
        title: data.thread.title,
        category: data.thread.category,
      });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("เกิดข้อผิดพลาดในการโหลดกระทู้");
      }
    } finally {
      setLoading(false);
    }
  };

  // Trigger authentication guard popup if visitor attempts to view thread unauthenticated
  useEffect(() => { // Mount effect watching authentication status
    if (!authLoading && !isAuthenticated) { // Only evaluate once session check finishes and user is unauthenticated
      requireAuth(() => {}, "ดูเนื้อหากระทู้"); // Trigger modal with action prompt
    } // End check
  }, [authLoading, isAuthenticated, requireAuth]); // Re-run when auth loading or status resolves

  // Fetch thread content and register view strictly when user is authenticated
  useEffect(() => { // Mount effect to load thread data
    if (!authLoading && isAuthenticated) { // Ensure user session is validated
      fetchThreadData(); // Fetch thread details and comments

      // Record view count strictly once per session/visit (prevents React StrictMode double count)
      const sessionKey = `kratuu_viewed_${id}`; // Unique session key for this thread
      const hasViewedInSession = typeof window !== "undefined" && sessionStorage.getItem(sessionKey); // Check session storage

      if (!hasViewedInSession) { // Check if not previously viewed in current session
        try { // Try recording view count
          sessionStorage.setItem(sessionKey, "1"); // Mark viewed in session storage
          fetch(`/api/threads/${id}/view`, { method: "POST" }) // Send view count increment
            .then((res) => res.json()) // Parse JSON response
            .then((data) => { // Process response data
              if (data?.views !== undefined) { // Check if views returned
                setThread((prev) => (prev ? { ...prev, views: data.views } : prev)); // Update thread views state
              } // End check
            }) // End then
            .catch(() => {}); // Suppress non-critical view errors
        } catch { // Catch session storage write errors
          // Ignore session storage errors
        } // End try-catch
      } // End session check

      const saved = getStoredHandle(); // Retrieve saved author handle
      if (saved) { // Check if saved handle exists
        setReplyAuthor(saved); // Pre-fill reply author
      } else { // Fallback handle
        setReplyAuthor("สมาชิกหมายเลข_" + Math.floor(1000 + Math.random() * 9000)); // Generate anonymous handle
      } // End if-else
    } // End auth check
  }, [id, authLoading, isAuthenticated]); // Re-run on id or auth status change

  // Synchronize reply author with authenticated user display name
  useEffect(() => { // Watch user state
    if (user) { // If user is logged in
      setReplyAuthor(user.display_name); // Set reply author to user display name
    } // End user check
  }, [user]); // Re-run when user changes

  const handleVote = (type: 1 | -1) => {
    requireAuth(async () => {
      if (!thread) return;

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

  const handleToggleBookmark = () => {
    requireAuth(() => {
      if (!thread) return;
      const active = toggleBookmark({
        id: thread.id,
        title: thread.title,
        category: thread.category,
      });
      setBookmarked(active);
    }, "บันทึกกระทู้");
  };

  const handlePostReply = async (parentId?: string | null) => {
    requireAuth(async () => {
      if (!replyContent.trim()) return;
      setSubmittingReply(true);

      try {
        if (replyAuthor.trim()) {
          setStoredHandle(replyAuthor.trim());
        }

        const res = await fetch(`/api/threads/${id}/comments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: replyContent,
            author_name: replyAuthor,
            author_pin: replyPin,
            parent_id: parentId || null,
          }),
        });

        if (!res.ok) throw new Error("ไม่สามารถส่งความคิดเห็นได้");

        setReplyContent("");
        setReplyingToId(null);
        await fetchThreadData();
      } catch (err) {
        alert("เกิดข้อผิดพลาดในการส่งความคิดเห็น");
      } finally {
        setSubmittingReply(false);
      }
    }, parentId ? "ส่งคำตอบ" : "ตอบกระทู้");
  };

  const isOwner = Boolean(user && thread?.user_id && user.id === thread.user_id);

  const handleDeleteThread = async () => {
    if (!isOwner && !deletePin.trim()) {
      setDeleteError("กรุณากรอก PIN");
      return;
    }
    setIsDeleting(true);
    setDeleteError("");

    try {
      const res = await fetch(`/api/threads/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: isOwner ? "" : deletePin }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถลบกระทู้ได้");
      }

      router.push("/");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setDeleteError(err.message);
      } else {
        setDeleteError("เกิดข้อผิดพลาดในการลบกระทู้");
      }
      setIsDeleting(false);
    }
  };

  const formatTime = (ms: number) => { // Format timestamp into relative Thai time
    const diff = Math.floor((Date.now() - ms) / 1000); // Elapsed seconds
    if (diff < 60) return "เมื่อสักครู่"; // Under one minute
    if (diff < 3600) return `${Math.floor(diff / 60)} น. ที่แล้ว`; // Under one hour
    if (diff < 86400) return `${Math.floor(diff / 3600)} ชม. ที่แล้ว`; // Under one day
    return `${Math.floor(diff / 86400)} วันที่แล้ว`; // Days elapsed
  }; // End formatTime

  if (authLoading) { // Display loading state while session verification is in progress
    return ( // Render session verification loader
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col font-sans">
        <Header onOpenDrawer={() => setDrawerOpen(true)} />
        <BookmarksDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-20 text-center font-mono text-sm flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>กำลังตรวจสอบสิทธิ์การเข้าถึง...</span>
        </main>
      </div>
    ); // End return
  } // End authLoading check

  if (!isAuthenticated) { // Render unauthenticated lock screen
    return ( // Render gate screen
      <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col font-sans">
        <Header onOpenDrawer={() => setDrawerOpen(true)} />
        <BookmarksDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
        <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-16 flex flex-col items-center justify-center">
          <div className="w-full border border-black dark:border-white p-8 sm:p-12 text-center bg-white dark:bg-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,1)]">
            <div className="w-12 h-12 mx-auto mb-4 border border-black dark:border-white flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold font-mono uppercase tracking-tight mb-2">
              กรุณาเข้าสู่ระบบก่อนดูเนื้อหากระทู้
            </h1>
            <p className="text-xs sm:text-sm font-mono text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
              กระทู้นี้จำกัดการเข้าถึงเฉพาะสมาชิก เข้าสู่ระบบหรือลงทะเบียนเพื่ออ่านเนื้อหาและร่วมแสดงความคิดเห็น
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => requireAuth(() => {}, "ดูเนื้อหากระทู้")}
                className="w-full sm:w-auto px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black font-mono text-xs uppercase font-bold hover:opacity-85 transition-opacity"
              >
                เข้าสู่ระบบ / ลงทะเบียน
              </button>
              <button
                type="button"
                onClick={handleGoBack}
                className="w-full sm:w-auto px-6 py-2.5 border border-black dark:border-white font-mono text-xs uppercase font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors cursor-pointer"
              >
                ← กลับสู่หน้ากระทู้
              </button>
            </div>
          </div>
        </main>
      </div>
    ); // End return
  } // End unauthenticated check

  return ( // Render main thread detail content
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col">
      <Header onOpenDrawer={() => setDrawerOpen(true)} />
      <BookmarksDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {/* Navigation back */}
        <div className="mb-6 flex items-center justify-between">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้ากระทู้</span>
          </button>
        </div>

        {loading ? (
          <div className="py-24 text-center font-mono text-sm">
            กำลังโหลดข้อมูลกระทู้...
          </div>
        ) : errorMsg || !thread ? (
          <div className="border border-black dark:border-white p-6 text-center font-mono">
            <p className="text-sm">{errorMsg || "ไม่พบกระทู้"}</p>
            <button
              type="button"
              onClick={handleGoBack}
              className="inline-block mt-4 underline text-xs cursor-pointer font-mono"
            >
              กลับสู่หน้ากระทู้
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Thread Article Container */}
            <article className="border border-black dark:border-white p-6 sm:p-8 break-words [overflow-wrap:anywhere] overflow-hidden">
              {/* Top metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-black dark:border-white pb-3 mb-6 text-xs font-mono">
                <div className="flex items-center gap-2">
                  <span className="border border-black dark:border-white px-2 py-0.5 font-bold uppercase">
                    {thread.category}
                  </span>
                  <span>โดย {thread.author_name}</span>
                </div>
                <div className="flex items-center gap-3 text-neutral-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{formatTime(thread.created_at)}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{thread.views} ครั้ง</span>
                  </span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-xl sm:text-3xl font-black leading-tight tracking-tight mb-6 break-words [overflow-wrap:anywhere]">
                {thread.title}
              </h1>

              {/* Main Content (Markdown) */}
              <div className="mb-8">
                <MarkdownRenderer content={thread.content} />
              </div>

              {/* Tags */}
              {thread.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-6 text-xs font-mono">
                  {thread.tags.map((t) => (
                    <span key={t} className="px-2 py-0.5 border border-neutral-400 dark:border-neutral-600">
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              {/* Actions row: Vote, Bookmark, Delete */}
              <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-black dark:border-white text-xs font-mono">
                {/* Vote box */}
                <div className="flex items-center border border-black dark:border-white">
                  <button
                    onClick={() => handleVote(1)}
                    className={`flex items-center gap-1 px-3 py-1.5 border-r border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${
                      userVote === 1 ? "bg-black text-white dark:bg-white dark:text-black font-bold" : ""
                    }`}
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>เห็นด้วย ({upvotes})</span>
                  </button>
                  <button
                    onClick={() => handleVote(-1)}
                    className={`flex items-center gap-1 px-3 py-1.5 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${
                      userVote === -1 ? "bg-black text-white dark:bg-white dark:text-black font-bold" : ""
                    }`}
                  >
                    <ChevronDown className="w-4 h-4" />
                    <span>ไม่เห็นด้วย ({downvotes})</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleToggleBookmark}
                    className={`flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors ${
                      bookmarked ? "bg-black text-white dark:bg-white dark:text-black font-semibold" : ""
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{bookmarked ? "บันทึกแล้ว" : "บันทึกกระทู้"}</span>
                  </button>

                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-black dark:border-white text-neutral-600 hover:text-black dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-900 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>ลบกระทู้</span>
                  </button>
                </div>
              </div>
            </article>

            {/* Comments Section */}
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-black dark:border-white pb-2 font-mono">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <span>ความคิดเห็น ({comments.length})</span>
                </h2>
              </div>

              {/* Root Reply Form */}
              <div className="border border-black dark:border-white p-4 space-y-4 bg-neutral-50/50 dark:bg-neutral-950/50">
                <span className="font-mono text-xs font-bold uppercase tracking-wider block">
                  ร่วมแสดงความคิดเห็น
                </span>

                <MarkdownEditor
                  value={replyContent}
                  onChange={setReplyContent}
                  placeholder="เขียนความคิดเห็นของคุณ... (รองรับ Markdown)"
                  minHeight="min-h-[140px]"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <input
                    type="text"
                    value={replyAuthor}
                    onChange={(e) => setReplyAuthor(e.target.value)}
                    placeholder="นามแฝง (เช่น สมาชิกหมายเลข_xxxx)"
                    className="px-3 py-2 border border-black dark:border-white bg-transparent focus:outline-none"
                  />
                  <input
                    type="password"
                    maxLength={6}
                    value={replyPin}
                    onChange={(e) => setReplyPin(e.target.value)}
                    placeholder="PIN 4 หลัก (เผื่อต้องการแก้ไข)"
                    className="px-3 py-2 border border-black dark:border-white bg-transparent focus:outline-none"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handlePostReply(null)}
                    disabled={submittingReply || !replyContent.trim()}
                    className="px-5 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-mono text-xs font-bold hover:opacity-85 disabled:opacity-40 transition-opacity"
                  >
                    {submittingReply ? "กำลังส่ง..." : "ตอบกระทู้"}
                  </button>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="py-12 text-center text-neutral-400 font-mono text-sm border border-dashed border-neutral-300 dark:border-neutral-800 p-4">
                    ยังไม่มีผู้แสดงความคิดเห็น เป็นคนแรกที่ตอบกระทู้นี้!
                  </div>
                ) : (
                  comments.map((comment, index) => (
                    <div
                      key={comment.id}
                      className="border border-black dark:border-white p-4 space-y-3"
                    >
                      {/* Comment Header */}
                      <div className="flex items-center justify-between text-xs font-mono text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black dark:text-white">
                            ความคิดเห็นที่ {index + 1}
                          </span>
                          <span>•</span>
                          <span>{comment.author_name}</span>
                        </div>
                        <span>{formatTime(comment.created_at)}</span>
                      </div>

                      {/* Comment Body */}
                      <div className="text-sm">
                        <MarkdownRenderer content={comment.content} />
                      </div>

                      {/* Comment Footer & Inline reply trigger */}
                      <div className="flex items-center justify-between text-xs font-mono pt-2">
                        <button
                          onClick={() => requireAuth(() => setReplyingToId(replyingToId === comment.id ? null : comment.id), "ตอบกระทู้")}
                          className="flex items-center gap-1 hover:underline"
                        >
                          <Reply className="w-3.5 h-3.5" />
                          <span>ตอบกลับ</span>
                        </button>
                      </div>

                      {/* Inline Reply Form */}
                      {replyingToId === comment.id && (
                        <div className="mt-3 p-3 border border-black dark:border-white space-y-2 bg-neutral-100 dark:bg-neutral-900">
                          <div className="text-xs font-mono font-semibold">
                            ตอบกลับความคิดเห็นที่ {index + 1}
                          </div>
                          <textarea
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="เขียนข้อความตอบกลับ..."
                            className="w-full p-2 text-xs font-mono border border-black dark:border-white bg-transparent focus:outline-none min-h-[80px]"
                          />
                          <div className="flex justify-between items-center text-xs font-mono">
                            <input
                              type="text"
                              value={replyAuthor}
                              onChange={(e) => setReplyAuthor(e.target.value)}
                              placeholder="นามแฝง"
                              className="px-2 py-1 border border-black dark:border-white bg-transparent w-48"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setReplyingToId(null)}
                                className="px-3 py-1 border border-black dark:border-white"
                              >
                                ยกเลิก
                              </button>
                              <button
                                onClick={() => handlePostReply(comment.id)}
                                disabled={submittingReply || !replyContent.trim()}
                                className="px-3 py-1 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-bold"
                              >
                                {submittingReply ? "กำลังส่ง..." : "ส่งคำตอบ"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nested Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-black dark:border-white space-y-3">
                          {comment.replies.map((sub, sIdx) => (
                            <div
                              key={sub.id}
                              className="p-3 border border-neutral-300 dark:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-950/50 text-xs font-mono space-y-1.5"
                            >
                              <div className="flex justify-between text-neutral-500 text-[11px]">
                                <span className="font-semibold text-black dark:text-white">
                                  ความคิดเห็นย่อย {index + 1}-{sIdx + 1} • {sub.author_name}
                                </span>
                                <span>{formatTime(sub.created_at)}</span>
                              </div>
                              <div className="text-sm font-sans">
                                <MarkdownRenderer content={sub.content} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {/* Delete PIN Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
            <div className="w-full max-w-sm border border-black dark:border-white bg-white dark:bg-black p-6 font-mono space-y-4 shadow-2xl">
              <h3 className="font-bold text-base">ยืนยันการลบกระทู้</h3>
              {isOwner ? (
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  คุณเป็นเจ้าของกระทู้นี้ (โพสต์โดย @{user?.username}) คุณต้องการลบกระทู้นี้ออกจากระบบใช่หรือไม่?
                </p>
              ) : (
                <>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">
                    กรุณาระบุรหัส PIN 4 หลักที่คุณตั้งไว้ตอนสร้างกระทู้ เพื่อลบกระทู้นี้
                  </p>
                  <input
                    type="password"
                    maxLength={6}
                    value={deletePin}
                    onChange={(e) => setDeletePin(e.target.value)}
                    placeholder="PIN 4 หลัก"
                    className="w-full px-3 py-2 border border-black dark:border-white bg-transparent text-sm focus:outline-none"
                  />
                </>
              )}

              {deleteError && (
                <div className="p-2 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-xs">
                  {deleteError}
                </div>
              )}

              <div className="flex justify-end gap-2 text-xs">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteError("");
                    setDeletePin("");
                  }}
                  className="px-4 py-2 border border-black dark:border-white hover:bg-neutral-100 dark:hover:bg-neutral-900"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={handleDeleteThread}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-bold hover:opacity-85"
                >
                  {isDeleting ? "กำลังลบ..." : "ยืนยันลบ"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
