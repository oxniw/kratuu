// ==============================================================================
// File: .//Description-of-file/thread_detail_api.md
// Overview: Retrieves thread content and handles deletion with PIN or author session authentication.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js server request and response types
import { getDb } from "@/lib/db"; // Import SQLite database connection helper
import { Thread, CommentItem } from "@/types"; // Import core Thread and CommentItem interfaces
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolution helper
import { getUserVoteMap } from "@/lib/vote/voteService"; // Import vote mapping utility

export async function GET( // Handle GET requests for thread detail
  req: NextRequest, // Next.js HTTP request object
  props: { params: Promise<{ id: string }> } // Route dynamic URL parameters
) {
  try { // Begin request processing try block
    const sessionUser = await getSessionUser(); // Retrieve active session user
    if (!sessionUser) { // Reject unauthenticated access per security guidelines
      return NextResponse.json( // Return 401 Unauthorized response
        { error: "กรุณาเข้าสู่ระบบก่อนดูเนื้อหากระทู้" }, // Thai error message
        { status: 401 } // HTTP 401 Unauthorized status
      ); // End return
    } // End auth check

    const { id } = await props.params; // Await route params to retrieve thread id
    const db = await getDb(); // Initialize database connection

    // Fetch thread from database
    const threadRes = await db.execute({ // Execute SQL query to select thread by ID
      sql: "SELECT * FROM threads WHERE id = ?", // Parameterized SQL query
      args: [id], // Query arguments
    }); // End db execute

    if (threadRes.rows.length === 0) { // Check if thread does not exist
      return NextResponse.json({ error: "Thread not found" }, { status: 404 }); // Return 404 Not Found
    } // End not found check

    const row = threadRes.rows[0]; // Retrieve first matched record row
    const threadVoteMap = await getUserVoteMap(sessionUser.id, [id], "thread"); // Resolve user vote status

    const thread: Thread = { // Map database row to Thread model
      id: String(row.id), // Thread unique identifier
      user_id: row.user_id ? String(row.user_id) : null, // Author user ID if registered
      title: String(row.title), // Thread title
      content: String(row.content), // Thread content
      author_name: String(row.author_name), // Author display name
      category: String(row.category), // Category name
      tags: JSON.parse(String(row.tags || "[]")), // Parsed tags array
      upvotes: Number(row.upvotes), // Upvote counter
      downvotes: Number(row.downvotes), // Downvote counter
      views: Number(row.views), // View counter
      created_at: Number(row.created_at), // Creation timestamp
      updated_at: Number(row.updated_at), // Last update timestamp
      user_vote: threadVoteMap[id] || 0, // Current user vote state
    }; // End thread mapping

    // Fetch comments for thread
    const commentsRes = await db.execute({ // Query comments associated with thread ID
      sql: "SELECT * FROM comments WHERE thread_id = ? ORDER BY created_at ASC", // Chronological ordering
      args: [id], // Thread ID argument
    }); // End comments execute

    const commentIds = commentsRes.rows.map((c) => String(c.id)); // Extract comment IDs
    const commentVoteMap = await getUserVoteMap(sessionUser.id, commentIds, "comment"); // Resolve comment votes

    const rawComments: CommentItem[] = commentsRes.rows.map((c) => ({ // Map comment rows
      id: String(c.id), // Comment unique identifier
      thread_id: String(c.thread_id), // Associated thread ID
      parent_id: c.parent_id ? String(c.parent_id) : null, // Parent comment ID if nested reply
      content: String(c.content), // Comment body content
      author_name: String(c.author_name), // Commenter display name
      upvotes: Number(c.upvotes), // Comment upvote count
      downvotes: Number(c.downvotes), // Comment downvote count
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
    const { id } = await props.params; // Await thread ID parameter
    let pin = ""; // Initialize author PIN variable
    try { // Try extracting JSON payload
      const body = await req.json(); // Parse request body
      pin = body.pin; // Extract PIN string
    } catch {} // Ignore parsing failures for empty body

    const db = await getDb(); // Initialize database connection
    const sessionUser = await getSessionUser(); // Retrieve active session user

    const threadRes = await db.execute({ // Query thread credentials and ownership
      sql: "SELECT author_pin, user_id FROM threads WHERE id = ?", // Select PIN and author ID
      args: [id], // Thread ID argument
    }); // End thread execute

    if (threadRes.rows.length === 0) { // Check if thread exists
      return NextResponse.json({ error: "Thread not found" }, { status: 404 }); // Return 404 Not Found
    } // End not found check

    const row = threadRes.rows[0]; // Retrieve thread row
    const storedPin = row.author_pin; // Retrieve stored PIN
    const threadUserId = row.user_id ? String(row.user_id) : null; // Retrieve owner user ID

    // Check if the current authenticated user owns this thread or has admin role
    const isOwner = sessionUser && threadUserId && sessionUser.id === threadUserId; // Check ownership
    const isAdmin = sessionUser && sessionUser.role === "admin"; // Check admin role

    if (!isOwner && !isAdmin) { // If user is not author or admin, verify PIN
      if (!storedPin) { // If no PIN was configured
        return NextResponse.json( // Return forbidden response
          { error: "กระทู้นี้ไม่ได้ตั้ง PIN ไว้ และคุณไม่ได้เป็นเจ้าของกระทู้" }, // Error message
          { status: 403 } // HTTP 403 Forbidden status
        ); // End return
      } // End missing PIN check

      if (String(storedPin) !== String(pin)) { // Compare submitted PIN against stored hash/pin
        return NextResponse.json({ error: "รหัส PIN ไม่ถูกต้อง" }, { status: 401 }); // Return 401 Unauthorized
      } // End invalid PIN check
    } // End permission check

    await db.execute({ sql: "DELETE FROM comments WHERE thread_id = ?", args: [id] }); // Delete associated comments
    await db.execute({ sql: "DELETE FROM threads WHERE id = ?", args: [id] }); // Delete thread record

    return NextResponse.json({ success: true }); // Return successful deletion response
  } catch (error) { // Catch unexpected errors
    console.error("DELETE /api/threads/[id] error:", error); // Log error details
    return NextResponse.json({ error: "Failed to delete thread" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End DELETE
