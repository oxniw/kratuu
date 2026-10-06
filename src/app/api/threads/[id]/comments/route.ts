// ==============================================================================
// File: .//Description-of-file/comments_api.md
// Overview: Endpoint to append new comments or replies with rate limiting, input validation, and injection guards.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolver
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { createCommentSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function POST( // Handle POST requests to append comments
  req: NextRequest, // Next.js HTTP request object
  props: { params: Promise<{ id: string }> } // Route dynamic URL parameters
) {
  try { // Begin comment processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const sessionUser = await getSessionUser(); // Check active user session
    if (!sessionUser) { // Reject unauthenticated commenting
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนแสดงความคิดเห็น" }, { status: 401 }); // Return 401
    } // End auth check

    // Check rate limit: 30 comments per 5 minutes per user / IP
    const rateCheck = checkRateLimit(`comment:${sessionUser.id}:${clientIp}`, { windowMs: 5 * 60 * 1000, maxRequests: 30 }); // Rate limit comments
    if (!rateCheck.allowed) { // If limit exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `คุณโพสต์ความคิดเห็นถี่เกินไป กรุณารอ ${rateCheck.resetInSeconds} วินาทีก่อนโพสต์อีกครั้ง` }, // Localized error message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const { id } = await props.params; // Await thread ID
    const cleanThreadId = String(id).trim(); // Sanitize primitive
    if (!cleanThreadId || cleanThreadId.startsWith("$") || cleanThreadId.includes(".")) { // Validate thread ID
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 }); // Return bad request
    } // End ID check

    const body = await req.json(); // Parse request body
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = createCommentSchema.safeParse(body); // Validate comment payload
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid comment data"; // Extract issue
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400 Bad Request
    } // End validation check

    const { content, author_name, author_pin, parent_id } = parsed.data; // Destructure validated fields

    const db = await getDb(); // Retrieve MongoDB database instance
    const commentId = "c-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6); // Generate unique comment ID
    const author = sessionUser.display_name || (author_name ? author_name.trim() : "สมาชิก"); // Author name
    const now = Date.now(); // Current timestamp

    await db.collection("comments").insertOne({ // Insert comment document into MongoDB
      id: commentId, // Unique comment ID
      thread_id: cleanThreadId, // Associated thread ID
      user_id: sessionUser.id, // Authenticated commenter user ID
      parent_id: parent_id && parent_id.trim() ? parent_id.trim() : null, // Parent ID for nested reply
      content: content.trim(), // Comment text
      author_name: author, // Author display name
      author_pin: author_pin && author_pin.trim() ? author_pin.trim() : null, // Author PIN
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
