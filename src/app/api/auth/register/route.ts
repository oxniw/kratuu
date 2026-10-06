// ==============================================================================
// File: .//Description-of-file/auth_register_api.md
// Overview: Handles user registration HTTP requests with rate limiting, input validation, and NoSQL injection defense.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js server types
import { registerUser } from "@/lib/auth/authService"; // Import user registration business logic
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { registerSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function POST(req: NextRequest) { // Handles user registration requests
  try { // Begin processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const rateCheck = checkRateLimit(`register:${clientIp}`, { windowMs: 10 * 60 * 1000, maxRequests: 5 }); // Rate limit 5 attempts per 10 minutes
    if (!rateCheck.allowed) { // If rate threshold is exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `Too many registration attempts. Please wait ${rateCheck.resetInSeconds} seconds before trying again.` }, // Rate limit error message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const body = await req.json(); // Parse request JSON payload
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = registerSchema.safeParse(body); // Validate payload schema
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid registration data"; // Extract first validation error
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400 response
    } // End validation check

    const { username, display_name, password, email } = parsed.data; // Destructure validated fields
    const result = await registerUser(username, display_name, password, email || undefined); // Execute registration

    if (!result.success) { // Handle registration failure
      return NextResponse.json({ error: result.error }, { status: 400 }); // Return 400 with error message
    } // End failure check

    return NextResponse.json({ success: true, user: result.user }, { status: 201 }); // Return 201 Created
  } catch (error) { // Catch unexpected errors
    console.error("POST /api/auth/register error:", error); // Log server error
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 }); // Return 500 response
  } // End try-catch
} // End POST handler
