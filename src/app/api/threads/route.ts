// ==============================================================================
// File: .//Description-of-file/threads_api.md
// Overview: Thread collection endpoint handling dynamic filtered searches, sorting, and thread creation via MongoDB.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js HTTP request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { Thread } from "@/types"; // Import Thread entity type
import { THREAD_RULES } from "@/lib/constants"; // Import thread validation constants
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolver
import { getUserVoteMap } from "@/lib/vote/voteService"; // Import user vote mapping helper
import { findBoard } from "@/lib/categories"; // Import category directory lookup helper

export async function GET(req: NextRequest) { // Handles querying threads with filtering and sorting
  try { // Begin query processing
    const db = await getDb(); // Retrieve MongoDB database instance
    const { searchParams } = new URL(req.url); // Parse incoming request URL query parameters

    const sort = searchParams.get("sort") || "latest"; // Sort criteria: 'latest' | 'top' | 'comments'
    const tag = searchParams.get("tag"); // Optional tag filter
    const category = searchParams.get("category"); // Optional category filter
    const q = searchParams.get("q"); // Optional text search query

    const matchFilter: Record<string, any> = {}; // Initialize MongoDB match query filter

    if (q && typeof q === "string" && q.trim()) { // If text query is present
      const escaped = q.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex special characters
      matchFilter.$or = [ // Match title or content case-insensitively
        { title: { $regex: escaped, $options: "i" } },
        { content: { $regex: escaped, $options: "i" } },
      ];
    }

    if (category && typeof category === "string" && category.trim()) { // If category filter is active
      const cleanCat = category.trim(); // Trim category string
      const matched = findBoard(cleanCat); // Resolve matching board from categories registry
      const catConditions: any[] = [{ category: cleanCat }, { tags: cleanCat }]; // Base category conditions

      if (matched) { // If matched specific board
        catConditions.push({ category: matched.board.name }); // Add standard board name
        catConditions.push({ tags: matched.board.name }); // Add board name tag
      }

      if (matchFilter.$or) { // If search query already populated $or
        matchFilter.$and = [{ $or: matchFilter.$or }, { $or: catConditions }]; // Combine with $and
        delete matchFilter.$or; // Remove root $or
      } else { // Direct category filter
        matchFilter.$or = catConditions; // Set category conditions
      }
    }

    if (tag && typeof tag === "string" && tag.trim()) { // If tag filter is provided
      matchFilter.tags = tag.trim(); // Match tag element in tags array
    }

    // Build aggregation pipeline to compute comment counts and score dynamically
    const pipeline: any[] = [
      { $match: matchFilter }, // Filter threads matching search criteria
      {
        $lookup: { // Left outer join with comments collection
          from: "comments",
          localField: "id",
          foreignField: "thread_id",
          as: "thread_comments",
        },
      },
      {
        $addFields: { // Compute comment count and voting score
          comment_count: { $size: "$thread_comments" },
          score: { $subtract: ["$upvotes", "$downvotes"] },
        },
      },
      {
        $project: { // Project fields excluding raw comments array
          thread_comments: 0,
        },
      },
    ];

    if (sort === "top") { // Sort by highest vote score
      pipeline.push({ $sort: { score: -1, created_at: -1 } });
    } else if (sort === "comments") { // Sort by highest number of comments
      pipeline.push({ $sort: { comment_count: -1, created_at: -1 } });
    } else { // Default to most recently created
      pipeline.push({ $sort: { created_at: -1 } });
    }

    pipeline.push({ $limit: 50 }); // Limit results to top 50 threads

    const rawThreads = await db.collection("threads").aggregate(pipeline).toArray(); // Execute pipeline

    const sessionUser = await getSessionUser(); // Check active user session
    const threadIds = rawThreads.map((r) => String(r.id)); // Extract thread IDs
    const voteMap = sessionUser // Map user votes if logged in
      ? await getUserVoteMap(sessionUser.id, threadIds, "thread")
      : {};

    const threads: Thread[] = rawThreads.map((row) => ({ // Map MongoDB documents to Thread interface
      id: String(row.id),
      user_id: row.user_id ? String(row.user_id) : null,
      title: String(row.title),
      content: String(row.content),
      author_name: String(row.author_name),
      category: String(row.category),
      tags: Array.isArray(row.tags) ? row.tags : [],
      upvotes: Number(row.upvotes || 0),
      downvotes: Number(row.downvotes || 0),
      views: Number(row.views || 0),
      created_at: Number(row.created_at),
      updated_at: Number(row.updated_at),
      comment_count: Number(row.comment_count || 0),
      user_vote: voteMap[String(row.id)] || 0,
    }));

    return NextResponse.json({ threads }); // Return JSON response
  } catch (error) { // Catch unexpected query errors
    console.error("GET /api/threads error:", error); // Log error
    return NextResponse.json({ error: "Failed to fetch threads" }, { status: 500 }); // Return 500 error
  }
}

export async function POST(req: NextRequest) { // Handles creating a new thread in MongoDB
  try { // Begin thread creation
    const db = await getDb(); // Retrieve MongoDB database instance
    const body = await req.json(); // Parse request JSON body

    const { title, content, author_name, author_pin, category, tags } = body; // Destructure payload

    const trimmedTitle = typeof title === "string" ? title.trim() : ""; // Normalize title
    const trimmedContent = typeof content === "string" ? content.trim() : ""; // Normalize content

    if (!trimmedTitle || !trimmedContent) { // Validate required text
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    if (trimmedTitle.length < THREAD_RULES.MIN_TITLE_LENGTH) { // Validate minimum title length
      return NextResponse.json(
        { error: `หัวข้อกระทู้ต้องมีความยาวอย่างน้อย ${THREAD_RULES.MIN_TITLE_LENGTH} ตัวอักษร` },
        { status: 400 }
      );
    }

    if (trimmedTitle.length > THREAD_RULES.MAX_TITLE_LENGTH) { // Validate maximum title length
      return NextResponse.json(
        { error: `หัวข้อกระทู้ต้องไม่เกิน ${THREAD_RULES.MAX_TITLE_LENGTH} ตัวอักษร` },
        { status: 400 }
      );
    }

    const sessionUser = await getSessionUser(); // Retrieve session user
    if (!sessionUser) { // Reject unauthenticated thread creation
      return NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนตั้งกระทู้ใหม่" },
        { status: 401 }
      );
    }

    const id = "k-" + Date.now().toString(36) + "-" + Math.random().toString(36).substring(2, 6); // Unique ID
    const author = sessionUser.display_name || (typeof author_name === "string" && author_name.trim()) || "สมาชิก"; // Author
    const userId = sessionUser.id; // User ID
    const cat = typeof category === "string" && category.trim() ? category.trim() : "ทั่วไป"; // Category
    const tagArray = Array.isArray(tags) ? tags.map((t) => String(t).trim()).filter(Boolean) : []; // Tag list
    const now = Date.now(); // Current timestamp

    await db.collection("threads").insertOne({ // Insert new thread document into MongoDB
      id,
      user_id: userId,
      title: trimmedTitle,
      content: trimmedContent,
      author_name: author,
      author_pin: typeof author_pin === "string" && author_pin.trim() ? author_pin.trim() : null,
      category: cat,
      tags: tagArray,
      upvotes: 0,
      downvotes: 0,
      views: 0,
      created_at: now,
      updated_at: now,
    }); // End insertOne

    return NextResponse.json({ success: true, id }, { status: 201 }); // Return 201 Created
  } catch (error) { // Catch unexpected creation errors
    console.error("POST /api/threads error:", error); // Log error
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 }); // Return 500 error
  }
}
