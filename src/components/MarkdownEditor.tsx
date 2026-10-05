// ==============================================================================
// File: .//Description-of-file/markdown_editor.md
// Overview: Textarea editor with Markdown formatting controls and live preview tab.
// ==============================================================================

"use client";

import React, { useState, useRef } from "react";
import MarkdownRenderer from "./MarkdownRenderer";
import { Bold, Italic, Code, Quote, List, Link as LinkIcon, Eye, Edit3 } from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function MarkdownEditor({
  value,
  onChange,
  placeholder = "เขียนเนื้อหาที่นี่... (รองรับ Markdown)",
  minHeight = "min-h-[220px]",
}: MarkdownEditorProps) {
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertSyntax = (prefix: string, suffix: string = "") => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const text = el.value;
    const selection = text.substring(start, end);

    const replacement = `${prefix}${selection || "ข้อความ"}${suffix}`;
    const nextVal = text.substring(0, start) + replacement + text.substring(end);
    onChange(nextVal);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(
        start + prefix.length,
        start + prefix.length + (selection ? selection.length : "ข้อความ".length)
      );
    }, 0);
  };

  return (
    <div className="border border-black dark:border-white">
      {/* Editor top toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 p-1.5 text-xs font-mono">
        {/* Formatting Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => insertSyntax("**", "**")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="ตัวหนา (Bold)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("*", "*")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="ตัวเอียง (Italic)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("`", "`")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="โค้ดบรรทัดเดียว (Inline Code)"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("```\n", "\n```")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="บล็อกโค้ด (Code Block)"
          >
            <span className="font-bold">{"</>"}</span>
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("> ")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="อ้างอิง (Quote)"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("- ")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="รายการ (List)"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => insertSyntax("[", "](https://)")}
            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-800 border border-transparent hover:border-black dark:hover:border-white"
            title="ใส่ลิงก์ (Link)"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center border border-black dark:border-white">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`px-2 py-1 flex items-center gap-1 ${
              mode === "write"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>เขียน</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-2 py-1 flex items-center gap-1 border-l border-black dark:border-white ${
              mode === "preview"
                ? "bg-black text-white dark:bg-white dark:text-black font-semibold"
                : "hover:bg-neutral-200 dark:hover:bg-neutral-800"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>ตัวอย่าง</span>
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {mode === "write" ? (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full p-3 font-mono text-sm bg-transparent text-black dark:text-white focus:outline-none resize-y ${minHeight}`}
        />
      ) : (
        <div className={`p-4 bg-white dark:bg-black overflow-y-auto ${minHeight}`}>
          {value.trim() ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-neutral-400 italic text-sm">ยังไม่มีข้อความสำหรับแสดงตัวอย่าง</p>
          )}
        </div>
      )}
    </div>
  );
}
