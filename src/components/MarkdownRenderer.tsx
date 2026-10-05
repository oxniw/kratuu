// ==============================================================================
// File: .//Description-of-file/markdown_renderer.md
// Overview: Renders and sanitizes Markdown content safely using marked and DOMPurify.
// ==============================================================================

"use client";

import React, { useMemo } from "react";
import { marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  const cleanHtml = useMemo(() => {
    try {
      const rawHtml = marked.parse(content || "", {
        gfm: true,
        breaks: true,
      }) as string;

      // Sanitize against XSS vectors
      return DOMPurify.sanitize(rawHtml, {
        ALLOWED_TAGS: [
          "p", "br", "strong", "em", "u", "s", "blockquote", "code", "pre",
          "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "li", "a", "hr", "span"
        ],
        ALLOWED_ATTR: ["href", "title", "target", "rel", "class"],
      });
    } catch {
      return DOMPurify.sanitize(content || "");
    }
  }, [content]);

  return (
    <div
      className={`prose-bw ${className}`}
      dangerouslySetInnerHTML={{ __html: cleanHtml }}
    />
  );
}
