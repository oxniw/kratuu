// ==============================================================================
// File: .//Description-of-file/thread_view_api.md
// Overview: Dedicated idempotent-separated view count increment endpoint for threads using MongoDB.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor

export async function POST( // Handle POST requests to increment thread view count
  req: NextRequest, // Next.js HTTP request object
  props: { params: Promise<{ id: string }> } // Route dynamic URL parameters
) {
  try { // Begin view count increment try block
    const { id } = await props.params; // Await thread ID
    const cleanId = String(id); // Sanitize primitive
    const db = await getDb(); // Retrieve MongoDB database instance

    const updated = await db.collection("threads").findOneAndUpdate( // Increment view count atomically
      { id: cleanId }, // Match thread ID
      { $inc: { views: 1 } }, // Increment views field by 1
      { returnDocument: "after" } // Return updated document
    ); // End findOneAndUpdate

    const views = Number(updated?.views ?? 0); // Extract updated view counter
    return NextResponse.json({ success: true, views }); // Return updated count
  } catch (error) { // Catch unexpected errors
    console.error("POST /api/threads/[id]/view error:", error); // Log error
    return NextResponse.json({ error: "Failed to increment view" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End POST
