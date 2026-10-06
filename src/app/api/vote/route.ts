// ==============================================================================
// File: .//Description-of-file/vote_api.md
// Overview: Endpoint to handle upvoting and downvoting on threads and comments with validation and rate limiting.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js server types
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolver
import { applyVote } from "@/lib/vote/voteService"; // Import vote mutation service
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { voteSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function POST(req: NextRequest) { // Handles user voting actions
  try { // Begin processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const sessionUser = await getSessionUser(); // Check active user session
    if (!sessionUser) { // Reject unauthenticated voting
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนโหวต" }, { status: 401 }); // Return 401
    } // End auth check

    // Check rate limit: 60 votes per minute per user / IP
    const rateCheck = checkRateLimit(`vote:${sessionUser.id}:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 60 }); // Limit vote frequency
    if (!rateCheck.allowed) { // If limit exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `คุณโหวตถี่เกินไป กรุณารอ ${rateCheck.resetInSeconds} วินาที` }, // Localized message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const body = await req.json(); // Parse request body
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = voteSchema.safeParse(body); // Validate vote payload schema
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid vote payload"; // Extract error issue
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400 Bad Request
    } // End validation check

    const { target_id, target_type, vote_type } = parsed.data; // Destructure validated fields

    const result = await applyVote({ // Execute vote mutation
      userId: sessionUser.id, // Authenticated user ID
      targetId: target_id, // Validated target ID
      targetType: target_type, // Validated target type ("thread" | "comment")
      voteType: vote_type, // Validated vote type (1 | -1)
    }); // End applyVote

    return NextResponse.json({ // Return successful response
      success: true, // Success flag
      upvotes: result.upvotes, // Updated upvotes count
      downvotes: result.downvotes, // Updated downvotes count
      userVote: result.userVote, // Current user vote state
    }); // End return
  } catch (error) { // Catch unexpected errors
    console.error("POST /api/vote error:", error); // Log error
    return NextResponse.json({ error: "Failed to record vote" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End POST handler
