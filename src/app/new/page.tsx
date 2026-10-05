// ==============================================================================
// File: .//Description-of-file/new_thread_page.md
// Overview: Form page to compose and publish a new thread with title limits and markdown editor.
// ==============================================================================

"use client"; // Enable client-side component execution

import React, { useState, useEffect, useMemo, Suspense } from "react"; // Import React hooks and Suspense
import { useRouter, useSearchParams } from "next/navigation"; // Import Next navigation hooks
import Link from "next/link"; // Import Link for routing
import Header from "@/components/Header"; // Import global header component
import BookmarksDrawer from "@/components/BookmarksDrawer"; // Import bookmarks drawer
import MarkdownEditor from "@/components/MarkdownEditor"; // Import markdown editor
import { getStoredHandle, setStoredHandle } from "@/lib/storage"; // Import local handle storage helpers
import { THREAD_RULES } from "@/lib/constants"; // Import validation constants
import { useAuth } from "@/hooks/useAuth"; // Import authentication hook
import { useAuthGuard } from "@/hooks/useAuthGuard"; // Import auth guard hook
import { findBoard } from "@/lib/categories"; // Import board lookup helper
import { ArrowLeft, Send, Sparkles, ShieldCheck } from "lucide-react"; // Import UI icons

const CATEGORIES = [ // List of standard category options
  "พูดคุยทั่วไป", // General discussion
  "เทคโนโลยี", // Technology
  "ชีวิตและสังคม", // Life and society
  "การเงินและการลงทุน", // Finance
  "ภาพยนตร์และบันเทิง", // Entertainment
  "ปัญหาชีวิต/ระบาย", // Venting
  "ถามตอบความรู้", // Q&A
]; // End category options

const SUGGESTED_TAGS = ["เทคโนโลยี", "ความรู้สึก", "สาระ", "รีวิว", "คำถาม", "ข่าว"]; // Suggested default tags

function NewThreadContent() { // Inner component reading search params wrapped in Suspense
  const router = useRouter(); // Initialize router instance
  const searchParams = useSearchParams(); // Read URL search query parameters
  const categoryParam = searchParams.get("category"); // Extract category query parameter
  const matchedBoard = categoryParam ? findBoard(categoryParam) : null; // Find board details from category directory
  const initialCategory = matchedBoard ? matchedBoard.board.name : (categoryParam || "พูดคุยทั่วไป"); // Determine initial category

  const { user, loading: authLoading } = useAuth(); // Retrieve active authenticated user
  const { isAuthenticated, requireAuth } = useAuthGuard(); // Retrieve authentication verification helper
  const [drawerOpen, setDrawerOpen] = useState(false); // Track bookmarks drawer state

  const [title, setTitle] = useState(""); // Title input state
  const [content, setContent] = useState(""); // Content markdown state
  const [authorName, setAuthorName] = useState(""); // Display name state
  const [authorPin, setAuthorPin] = useState(""); // Author deletion PIN state
  const [category, setCategory] = useState(initialCategory); // Selected category state
  const [tagInput, setTagInput] = useState(""); // Tag input text state
  const [tags, setTags] = useState<string[]>([]); // Attached tags array state
  const [submitting, setSubmitting] = useState(false); // Form submission loading state
  const [errorMsg, setErrorMsg] = useState(""); // Submission error message state

  // Synchronize category state when initialCategory resolves
  useEffect(() => { // Sync category state on initial query resolution
    if (initialCategory) { // Check if category exists
      setCategory(initialCategory); // Set selected category
    } // End check
  }, [initialCategory]); // Trigger on initialCategory change

  // Compute category options including the preselected one if not in standard list
  const activeCategories = useMemo(() => { // Compute dynamic category chip options
    if (initialCategory && !CATEGORIES.includes(initialCategory)) { // If category is custom or board name
      return [initialCategory, ...CATEGORIES]; // Prepend active board category
    } // End check
    return CATEGORIES; // Return default category options
  }, [initialCategory]); // Recompute when initialCategory changes

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      const actionName = categoryParam ? "ตั้งกระทู้ในห้องนี้" : "ตั้งกระทู้ใหม่";
      requireAuth(() => {}, actionName);
    }
  }, [authLoading, isAuthenticated, requireAuth, categoryParam]);

  useEffect(() => {
    if (user) {
      setAuthorName(user.display_name);
    } else {
      const savedHandle = getStoredHandle();
      if (savedHandle) {
        setAuthorName(savedHandle);
      } else {
        setAuthorName("สมาชิกหมายเลข_" + Math.floor(1000 + Math.random() * 9000));
      }
    }
  }, [user]);

  const handleAddTag = (t: string) => {
    const cleaned = t.trim().replace(/^#/, "");
    if (cleaned && !tags.includes(cleaned) && tags.length < 5) {
      setTags([...tags, cleaned]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter((item) => item !== t));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      const actionName = categoryParam ? "ตั้งกระทู้ในห้องนี้" : "ตั้งกระทู้ใหม่";
      requireAuth(() => {}, actionName);
      return;
    }
    setErrorMsg("");

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("กรุณากรอกหัวข้อกระทู้");
      return;
    }

    if (trimmedTitle.length < THREAD_RULES.MIN_TITLE_LENGTH) {
      setErrorMsg(`หัวข้อกระทู้ต้องมีความยาวอย่างน้อย ${THREAD_RULES.MIN_TITLE_LENGTH} ตัวอักษร`);
      return;
    }

    if (trimmedTitle.length > THREAD_RULES.MAX_TITLE_LENGTH) {
      setErrorMsg(`หัวข้อกระทู้ต้องไม่เกิน ${THREAD_RULES.MAX_TITLE_LENGTH} ตัวอักษร`);
      return;
    }

    if (!content.trim()) {
      setErrorMsg("กรุณาใส่เนื้อหากระทู้");
      return;
    }

    setSubmitting(true);

    try {
      if (authorName.trim()) {
        setStoredHandle(authorName.trim());
      }

      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content,
          author_name: authorName,
          author_pin: authorPin,
          category,
          tags,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "ไม่สามารถตั้งกระทู้ได้");
      }

      router.push(`/thread/${data.id}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg("เกิดข้อผิดพลาดในการตั้งกระทู้");
      }
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex flex-col">
      <Header onOpenDrawer={() => setDrawerOpen(true)} />
      <BookmarksDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        {/* Navigation back */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับสู่หน้ารวมกระทู้</span>
          </Link>
        </div>

        {/* Heading */}
        <div className="border-b border-black dark:border-white pb-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-black font-mono tracking-tight uppercase">
            ตั้งกระทู้ใหม่
          </h1>
          <p className="text-xs font-mono text-neutral-500 dark:text-neutral-400 mt-1">
            แบ่งปันเรื่องราว คำถาม หรือข้อคิดเห็นของคุณลงบนเว็บบอร์ดขาวดำ
          </p>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-6 p-3 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-mono text-xs">
            [ข้อผิดพลาด] {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold mb-2">
              หมวดหมู่กระทู้
            </label>
            <div className="flex flex-wrap gap-2">
              {activeCategories.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-mono border transition-colors ${
                    category === cat
                      ? "border-black dark:border-white bg-black text-white dark:bg-white dark:text-black font-bold"
                      : "border-neutral-300 dark:border-neutral-700 hover:border-black dark:hover:border-white"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-mono uppercase font-bold">
                หัวข้อกระทู้ <span className="text-neutral-500">*</span>
              </label>
              <span
                className={`text-xs font-mono transition-colors ${
                  title.length >= THREAD_RULES.MAX_TITLE_LENGTH
                    ? "text-red-500 font-bold"
                    : title.length >= THREAD_RULES.MAX_TITLE_LENGTH * 0.85
                    ? "font-bold text-neutral-800 dark:text-neutral-200"
                    : "text-neutral-500"
                }`}
              >
                {title.length} / {THREAD_RULES.MAX_TITLE_LENGTH} ตัวอักษร
              </span>
            </div>
            <input
              type="text"
              required
              maxLength={THREAD_RULES.MAX_TITLE_LENGTH}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`ระบุหัวข้อกระทู้ (${THREAD_RULES.MIN_TITLE_LENGTH} - ${THREAD_RULES.MAX_TITLE_LENGTH} ตัวอักษร)...`}
              className="w-full px-3 py-2.5 border border-black dark:border-white bg-transparent font-sans text-base focus:outline-none"
            />
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold mb-2">
              เนื้อหากระทู้ <span className="text-neutral-500">* (Markdown)</span>
            </label>
            <MarkdownEditor
              value={content}
              onChange={setContent}
              placeholder="เขียนรายละเอียด คำถาม หรือเรื่องราวของคุณที่นี่... สามารถใช้หัวข้อ โค้ด ลิสต์ หรือข้อความตัวหนาได้"
              minHeight="min-h-[260px]"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-mono uppercase font-bold mb-2">
              แท็ก (สูงสุด 5 แท็ก)
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 border border-black dark:border-white text-xs font-mono flex items-center gap-1.5"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(t)}
                    className="hover:font-black"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag(tagInput);
                  }
                }}
                placeholder="พิมพ์แท็กแล้วกด Enter..."
                className="flex-1 px-3 py-1.5 border border-black dark:border-white bg-transparent text-xs font-mono focus:outline-none"
              />
              <button
                type="button"
                onClick={() => handleAddTag(tagInput)}
                className="px-3 py-1.5 border border-black dark:border-white text-xs font-mono hover:bg-neutral-100 dark:hover:bg-neutral-900"
              >
                เพิ่มแท็ก
              </button>
            </div>

            {/* Suggested Tags */}
            <div className="flex items-center gap-1.5 mt-2 text-xs font-mono text-neutral-500">
              <Sparkles className="w-3 h-3" />
              <span>แท็กแนะนำ:</span>
              {SUGGESTED_TAGS.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => handleAddTag(st)}
                  className="underline hover:text-black dark:hover:text-white"
                >
                  #{st}
                </button>
              ))}
            </div>
          </div>

          {/* Author handle & PIN */}
          {user ? (
            <div className="border-t border-black dark:border-white pt-4">
              <div className="border border-black dark:border-white p-3 flex items-center justify-between text-xs font-mono bg-neutral-50 dark:bg-neutral-950">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <div>
                    <span className="font-bold">โพสต์ในชื่อ: {user.display_name}</span>
                    <span className="text-neutral-500 ml-2">(@{user.username})</span>
                  </div>
                </div>
                <span className="text-[11px] text-neutral-500 border border-neutral-300 dark:border-neutral-700 px-2 py-0.5">
                  บัญชียืนยัน • จัดการกระทู้ได้โดยตรง
                </span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-black dark:border-white pt-4">
              <div>
                <label className="block text-xs font-mono uppercase font-bold mb-1">
                  นามแฝงผู้โพสต์ (แขก)
                </label>
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="สมาชิกหมายเลข_xxxx"
                  className="w-full px-3 py-2 border border-black dark:border-white bg-transparent text-xs font-mono focus:outline-none"
                />
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  จะถูกจำไว้ในเบราว์เซอร์นี้สำหรับครั้งถัดไป
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase font-bold mb-1">
                  รหัสผ่านลบกระทู้ (PIN 4-6 หลัก)
                </label>
                <input
                  type="password"
                  maxLength={6}
                  value={authorPin}
                  onChange={(e) => setAuthorPin(e.target.value)}
                  placeholder="••••"
                  className="w-full px-3 py-2 border border-black dark:border-white bg-transparent text-xs font-mono focus:outline-none"
                />
                <p className="text-[11px] font-mono text-neutral-500 mt-1">
                  ใช้สำหรับยืนยันหากต้องการลบกระทู้นี้ในอนาคต
                </p>
              </div>
            </div>
          )}

          {/* Submit bar */}
          <div className="border-t border-black dark:border-white pt-6 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-mono text-sm font-bold hover:opacity-85 disabled:opacity-50 transition-opacity"
            >
              <Send className="w-4 h-4" />
              <span>{submitting ? "กำลังเผยแพร่..." : "เผยแพร่กระทู้"}</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  ); // End render
} // End NewThreadContent

export default function NewThreadPage() { // Main export wrapped with Suspense boundary for search params
  return ( // Render Suspense wrapper
    <Suspense // Fallback during client-side search parameter resolution
      fallback={
        <div className="min-h-screen bg-white dark:bg-black text-black dark:text-white flex items-center justify-center font-mono text-sm">
          กำลังโหลด...
        </div>
      }
    >
      <NewThreadContent />
    </Suspense>
  ); // End render
} // End NewThreadPage

