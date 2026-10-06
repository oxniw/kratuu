// ==============================================================================
// File: .//Description-of-file/thread_detail_api.md
// Overview: Retrieves thread content and handles deletion with constant-time PIN comparison or author session authentication.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js server request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { Thread, CommentItem } from "@/types"; // Import core Thread and CommentItem interfaces
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolution helper
import { getUserVoteMap } from "@/lib/vote/voteService"; // Import vote mapping utility
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { safeCompareStrings } from "@/lib/security/timingSafe"; // Import constant-time comparison helper
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { deleteThreadSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function GET( // Handle GET requests for thread detail
  req: NextRequest, // Next.js HTTP request object
  props: { params: Promise<{ id: string }> } // Route dynamic URL parameters
) {
  try { // Begin request processing try block
    const sessionUser = await getSessionUser(); // Retrieve active session user if logged in
    const { id } = await props.params; // Await route params to retrieve thread id
    const cleanId = String(id).trim(); // Sanitize primitive string ID
    if (!cleanId || cleanId.startsWith("$") || cleanId.includes(".")) { // Reject invalid or operator-like ID
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 }); // Return bad request
    } // End ID validation
    const db = await getDb(); // Initialize database connection

    // Fetch thread from MongoDB
    const row = await db.collection("threads").findOne({ id: cleanId }); // Find thread document

    if (!row) { // Check if thread does not exist
      return NextResponse.json({ error: "Thread not found" }, { status: 404 }); // Return 404 Not Found
    } // End not found check

    const threadVoteMap = sessionUser // Resolve user vote status if authenticated
      ? await getUserVoteMap(sessionUser.id, [cleanId], "thread") // Query vote map
      : {}; // Guest empty map

    const thread: Thread = { // Map database document to Thread model
      id: String(row.id), // Thread unique identifier
      user_id: row.user_id ? String(row.user_id) : null, // Author user ID if registered
      title: String(row.title), // Thread title
      content: String(row.content), // Thread content
      author_name: String(row.author_name), // Author display name
      category: String(row.category), // Category name
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [], // Tags array
      upvotes: Number(row.upvotes || 0), // Upvote counter
      downvotes: Number(row.downvotes || 0), // Downvote counter
      views: Number(row.views || 0), // View counter
      created_at: Number(row.created_at), // Creation timestamp
      updated_at: Number(row.updated_at), // Last update timestamp
      user_vote: threadVoteMap[cleanId] || 0, // Current user vote state
    }; // End thread mapping

    // Fetch comments for thread in chronological order
    const commentsList = await db.collection("comments").find({ thread_id: cleanId }).sort({ created_at: 1 }).toArray(); // Find comments

    const commentIds = commentsList.map((c) => String(c.id)); // Extract comment IDs
    const commentVoteMap = sessionUser // Resolve comment votes if authenticated
      ? await getUserVoteMap(sessionUser.id, commentIds, "comment") // Query vote map
      : {}; // Guest empty map

    const rawComments: CommentItem[] = commentsList.map((c) => ({ // Map comment rows
      id: String(c.id), // Comment unique identifier
      thread_id: String(c.thread_id), // Associated thread ID
      parent_id: c.parent_id ? String(c.parent_id) : null, // Parent comment ID if nested reply
      content: String(c.content), // Comment body content
      author_name: String(c.author_name), // Commenter display name
      upvotes: Number(c.upvotes || 0), // Comment upvote count
      downvotes: Number(c.downvotes || 0), // Comment downvote count
      created_at: Number(c.created_at), // Comment creation timestamp
      user_vote: commentVoteMap[String(c.id)] || 0, // User vote on this comment
    })); // End comments mapping

    // Build hierarchical comment tree
    const commentMap = new Map<string, CommentItem>(); // Create lookup map for nesting
    const rootComments: CommentItem[] = []; // Array of top-level comments

    rawComments.forEach((c) => { // Populate lookup map with empty reply arrays
      commentMap.set(c.id, { ...c, replies: [] }); // Set item in map
    }); // End forEach

    rawComments.forEach((c) => { // Construct hierarchical relationships
      const item = commentMap.get(c.id)!; // Retrieve mapped item
      if (c.parent_id && commentMap.has(c.parent_id)) { // Check if parent comment exists
        commentMap.get(c.parent_id)!.replies!.push(item); // Nest under parent reply list
      } else { // Top-level comment
        rootComments.push(item); // Push to root comments array
      } // End if-else
    }); // End forEach

    return NextResponse.json({ thread, comments: rootComments }); // Return thread and comments payload
  } catch (error) { // Catch unexpected errors
    console.error("GET /api/threads/[id] error:", error); // Log error details
    return NextResponse.json({ error: "Failed to fetch thread" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End GET

export async function DELETE( // Handle DELETE requests for thread deletion
  req: NextRequest, // Next.js HTTP request object
  props: { params: Promise<{ id: string }> } // Route dynamic URL parameters
) {
  try { // Begin deletion try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const rateCheck = checkRateLimit(`del_thread:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 10 }); // Limit deletion attempts
    if (!rateCheck.allowed) { // If limit exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `Too many deletion attempts. Please wait ${rateCheck.resetInSeconds} seconds.` }, // Rate limit error
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const { id } = await props.params; // Await thread ID parameter
    const cleanId = String(id).trim(); // Sanitize primitive
    if (!cleanId || cleanId.startsWith("$") || cleanId.includes(".")) { // Validate ID format
      return NextResponse.json({ error: "Invalid thread ID" }, { status: 400 }); // Reject invalid ID
    } // End validation check

    let pin = ""; // Initialize author PIN variable
    try { // Try extracting JSON payload
      const body = await req.json(); // Parse request body
      if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
        return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
      } // End operator check
      const parsed = deleteThreadSchema.safeParse(body); // Validate body
      if (parsed.success && parsed.data.pin) { // Check pin presence
        pin = parsed.data.pin; // Extract validated PIN string
      } // End pin assignment
    } catch {} // Ignore parsing failures for empty body

    const db = await getDb(); // Initialize database connection
    const sessionUser = await getSessionUser(); // Retrieve active session user

    const row = await db.collection("threads").findOne({ id: cleanId }); // Query thread credentials and ownership

    if (!row) { // Check if thread exists
      return NextResponse.json({ error: "Thread not found" }, { status: 404 }); // Return 404 Not Found
    } // End not found check

    const storedPin = row.author_pin ? String(row.author_pin) : null; // Retrieve stored PIN
    const threadUserId = row.user_id ? String(row.user_id) : null; // Retrieve owner user ID

    // Check if the current authenticated user owns this thread or has admin role
    const isOwner = Boolean(sessionUser && threadUserId && sessionUser.id === threadUserId); // Check ownership
    const isAdmin = Boolean(sessionUser && sessionUser.role === "admin"); // Check admin role

    if (!isOwner && !isAdmin) { // If user is not author or admin, verify PIN
      if (!storedPin) { // If no PIN was configured
        return NextResponse.json( // Return forbidden response
          { error: "กระทู้นี้ไม่ได้ตั้ง PIN ไว้ และคุณไม่ได้เป็นเจ้าของกระทู้" }, // Error message
          { status: 403 } // HTTP 403 Forbidden status
        ); // End return
      } // End missing PIN check

      if (!safeCompareStrings(storedPin, pin)) { // Constant-time PIN comparison to protect against side-channel attacks
        return NextResponse.json({ error: "รหัส PIN ไม่ถูกต้อง" }, { status: 401 }); // Return 401 Unauthorized
      } // End invalid PIN check
    } // End permission check

    await db.collection("comments").deleteMany({ thread_id: cleanId }); // Delete associated comments safely
    await db.collection("threads").deleteOne({ id: cleanId }); // Delete thread record safely

    return NextResponse.json({ success: true }); // Return successful deletion response
  } catch (error) { // Catch unexpected errors
    console.error("DELETE /api/threads/[id] error:", error); // Log error details
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End DELETE
