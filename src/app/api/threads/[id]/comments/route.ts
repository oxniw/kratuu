// ==============================================================================
// File: .//Description-of-file/comments_api.md
// Overview: Endpoint to append new comments or threaded nested replies to a thread using MongoDB.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolver

export async function POST( // Handle POST requests to append comments
  req: NextRequest, // Next.js HTTP request object
  props: { params: Promise<{ id: string }> } // Route dynamic URL parameters
) {
  try { // Begin comment processing try block
    const sessionUser = await getSessionUser(); // Check active user session
    if (!sessionUser) { // Reject unauthenticated commenting
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น" }, { status: 401 }); // Return 401
    } // End auth check

    const { id } = await props.params; // Await thread ID
    const cleanThreadId = String(id); // Sanitize primitive
    const body = await req.json(); // Parse request body
    const { content, author_name, author_pin, parent_id } = body; // Destructure payload

    const trimmedContent = typeof content === "string" ? content.trim() : ""; // Normalize content
    if (!trimmedContent) { // Validate content presence
      return NextResponse.json({ error: "Comment content is required" }, { status: 400 }); // Return 400
    } // End check

    const db = await getDb(); // Retrieve MongoDB database instance
    const commentId = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6); // Generate unique comment ID
    const author = sessionUser.display_name || (typeof author_name === "string" && author_name.trim()) || "สมาชิก"; // Author
    const now = Date.now(); // Current timestamp

    await db.collection("comments").insertOne({ // Insert comment document into MongoDB
      id: commentId, // Unique comment ID
      thread_id: cleanThreadId, // Associated thread ID
      user_id: sessionUser.id, // Authenticated commenter user ID
      parent_id: typeof parent_id === "string" && parent_id.trim() ? parent_id.trim() : null, // Parent ID for nested reply
      content: trimmedContent, // Comment text
      author_name: author, // Author display name
      author_pin: typeof author_pin === "string" && author_pin.trim() ? author_pin.trim() : null, // Author PIN
      upvotes: 0, // Initial upvotes
      downvotes: 0, // Initial downvotes
      created_at: now, // Creation timestamp
    }); // End insertOne

    return NextResponse.json({ success: true, id: commentId }, { status: 201 }); // Return 201 Created
  } catch (error) { // Catch unexpected errors
    console.error("POST /api/threads/[id]/comments error:", error); // Log error
    return NextResponse.json({ error: "Failed to post comment" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End POST
