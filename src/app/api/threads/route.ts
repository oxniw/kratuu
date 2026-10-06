// ==============================================================================
// File: .//Description-of-file/threads_api.md
// Overview: Thread collection endpoint handling dynamic filtered searches, sorting, rate limiting, and thread creation via MongoDB.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js HTTP request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { Thread } from "@/types"; // Import Thread entity type
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolver
import { getUserVoteMap } from "@/lib/vote/voteService"; // Import user vote mapping helper
import { findBoard } from "@/lib/categories"; // Import category directory lookup helper
import { hasMongoOperators, safeRegexString } from "@/lib/security/mongoSanitizer"; // Import NoSQL security helpers
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { createThreadSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function GET(req: NextRequest) { // Handles querying threads with filtering and sorting
  try { // Begin query processing
    const db = await getDb(); // Retrieve MongoDB database instance
    const { searchParams } = new URL(req.url); // Parse incoming request URL query parameters

    const rawSort = searchParams.get("sort") || "latest"; // Sort criteria string
    const rawTag = searchParams.get("tag"); // Optional tag filter
    const rawCategory = searchParams.get("category"); // Optional category filter
    const rawQ = searchParams.get("q"); // Optional text search query

    const sort = ["latest", "top", "comments"].includes(rawSort) ? rawSort : "latest"; // Validate sort parameter
    const tag = typeof rawTag === "string" ? rawTag.trim().slice(0, 50) : null; // Sanitize tag parameter
    const category = typeof rawCategory === "string" ? rawCategory.trim().slice(0, 50) : null; // Sanitize category parameter
    const q = typeof rawQ === "string" ? rawQ.trim().slice(0, 100) : null; // Sanitize search query

    const matchFilter: Record<string, any> = {}; // Initialize MongoDB match query filter

    if (q) { // If text query is present
      const escaped = safeRegexString(q); // Escape regex special characters to prevent ReDoS
      matchFilter.$or = [ // Match title or content case-insensitively
        { title: { $regex: escaped, $options: "i" } }, // Search in thread title
        { content: { $regex: escaped, $options: "i" } }, // Search in thread content
      ]; // End regex filter
    } // End query check

    if (category && category.trim().toLowerCase() !== "board") { // If specific board category filter is active
      const cleanCat = category.trim(); // Trim category string
      const matched = findBoard(cleanCat); // Resolve matching board from categories registry
      const catConditions: any[] = [{ category: cleanCat }, { tags: cleanCat }]; // Base category conditions

      if (matched) { // If matched specific board
        catConditions.push({ category: matched.board.name }); // Add standard board name
        catConditions.push({ tags: matched.board.name }); // Add board name tag
      } // End matched check

      if (matchFilter.$or) { // If search query already populated $or
        matchFilter.$and = [{ $or: matchFilter.$or }, { $or: catConditions }]; // Combine with $and
        delete matchFilter.$or; // Remove root $or
      } else { // Direct category filter
        matchFilter.$or = catConditions; // Set category conditions
      } // End if-else
    } // End category check

    if (tag) { // If tag filter is provided
      matchFilter.tags = tag; // Match tag element in tags array
    } // End tag check

    // Build aggregation pipeline to compute comment counts and score dynamically
    const pipeline: any[] = [ // Construct MongoDB aggregation pipeline
      { $match: matchFilter }, // Filter threads matching search criteria
      { // Join comments collection
        $lookup: { // Left outer join with comments collection
          from: "comments", // Comments collection
          localField: "id", // Thread ID field
          foreignField: "thread_id", // Comment reference field
          as: "thread_comments", // Output array field
        }, // End lookup
      }, // End join
      { // Compute derived metrics
        $addFields: { // Compute comment count and voting score
          comment_count: { $size: "$thread_comments" }, // Total comments count
          score: { $subtract: ["$upvotes", "$downvotes"] }, // Net vote score
        }, // End addFields
      }, // End metrics
      { // Project fields
        $project: { // Project fields excluding raw comments array
          thread_comments: 0, // Exclude comments payload for performance
        }, // End project
      }, // End projection
    ]; // End pipeline

    if (sort === "top") { // Sort by highest vote score
      pipeline.push({ $sort: { score: -1, created_at: -1 } }); // Order by score descending
    } else if (sort === "comments") { // Sort by highest number of comments
      pipeline.push({ $sort: { comment_count: -1, created_at: -1 } }); // Order by comment count descending
    } else { // Default to most recently created
      pipeline.push({ $sort: { created_at: -1 } }); // Order by creation timestamp descending
    } // End sorting

    pipeline.push({ $limit: 50 }); // Limit results to top 50 threads

    const rawThreads = await db.collection("threads").aggregate(pipeline).toArray(); // Execute pipeline

    const sessionUser = await getSessionUser(); // Check active user session
    const threadIds = rawThreads.map((r) => String(r.id)); // Extract thread IDs
    const voteMap = sessionUser // Map user votes if logged in
      ? await getUserVoteMap(sessionUser.id, threadIds, "thread") // Retrieve vote mapping
      : {}; // Guest empty map

    const threads: Thread[] = rawThreads.map((row) => ({ // Map MongoDB documents to Thread interface
      id: String(row.id), // Thread unique identifier
      user_id: row.user_id ? String(row.user_id) : null, // Author user ID
      title: String(row.title), // Title string
      content: String(row.content), // Body content
      author_name: String(row.author_name), // Author display name
      category: String(row.category), // Category name
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [], // Clean tags array
      upvotes: Number(row.upvotes || 0), // Upvotes counter
      downvotes: Number(row.downvotes || 0), // Downvotes counter
      views: Number(row.views || 0), // View counter
      created_at: Number(row.created_at), // Creation timestamp
      updated_at: Number(row.updated_at), // Last update timestamp
      comment_count: Number(row.comment_count || 0), // Comments count
      user_vote: voteMap[String(row.id)] || 0, // User vote status
    })); // End threads mapping

    return NextResponse.json({ threads }); // Return JSON response
  } catch (error) { // Catch unexpected query errors
    console.error("GET /api/threads error:", error); // Log error
    const message = error instanceof Error ? error.message : "Failed to fetch threads"; // Format message
    return NextResponse.json({ error: message }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End GET handler

export async function POST(req: NextRequest) { // Handles creating a new thread in MongoDB
  try { // Begin thread creation
    const clientIp = getClientIp(req); // Resolve caller IP address
    const sessionUser = await getSessionUser(); // Retrieve session user

    if (!sessionUser) { // Reject unauthenticated thread creation
      return NextResponse.json( // Return 401 Unauthorized
        { error: "กรุณาเข้าสู่ระบบก่อนตั้งกระทู้ใหม่" }, // Localized message
        { status: 401 } // HTTP 401 status code
      ); // End return
    } // End auth check

    // Check rate limit: 15 threads per 5 minutes per user / IP
    const rateCheck = checkRateLimit(`thread:${sessionUser.id}:${clientIp}`, { windowMs: 5 * 60 * 1000, maxRequests: 15 }); // Limit rate
    if (!rateCheck.allowed) { // If limit exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `คุณสร้างกระทู้ถี่เกินไป กรุณารอ ${rateCheck.resetInSeconds} วินาทีก่อนสร้างกระทู้ใหม่` }, // Localized message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const body = await req.json(); // Parse request JSON body
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = createThreadSchema.safeParse(body); // Validate body schema
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid thread data"; // Extract issue
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400 Bad Request
    } // End validation check

    const { title, content, author_name, author_pin, category, tags } = parsed.data; // Destructure validated fields

    const db = await getDb(); // Retrieve MongoDB database instance
    const id = "k-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6); // Unique ID
    const author = sessionUser.display_name || (author_name ? author_name.trim() : "สมาชิก"); // Author name
    const userId = sessionUser.id; // User identifier
    const cat = category && category.trim() ? category.trim() : "ทั่วไป"; // Category
    const tagArray = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : []; // Tag list
    const now = Date.now(); // Current timestamp

    await db.collection("threads").insertOne({ // Insert new thread document into MongoDB
      id, // Unique ID
      user_id: userId, // User identifier
      title: title.trim(), // Sanitized title
      content: content.trim(), // Sanitized content
      author_name: author, // Author display name
      author_pin: author_pin && author_pin.trim() ? author_pin.trim() : null, // Deletion PIN
      category: cat, // Category string
      tags: tagArray, // Tags array
      upvotes: 0, // Initial upvotes
      downvotes: 0, // Initial downvotes
      views: 0, // Initial views
      created_at: now, // Creation timestamp
      updated_at: now, // Update timestamp
    }); // End insertOne

    return NextResponse.json({ success: true, id }, { status: 201 }); // Return 201 Created
  } catch (error) { // Catch unexpected creation errors
    console.error("POST /api/threads error:", error); // Log error
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End POST handler
