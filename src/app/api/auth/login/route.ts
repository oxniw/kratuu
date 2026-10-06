// ==============================================================================
// File: .//Description-of-file/auth_login_api.md
// Overview: Handles user credential verification, rate limiting, and NoSQL injection defense.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js server request and response types
import { loginUser } from "@/lib/auth/authService"; // Import authentication service function
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiting utilities
import { loginSchema } from "@/lib/security/schemas"; // Import runtime validation schema

export async function POST(req: NextRequest) { // Handles user login requests
  try { // Begin processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const rateCheck = checkRateLimit(`login:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 10 }); // Rate limit 10 attempts per minute
    if (!rateCheck.allowed) { // If rate threshold is exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `Too many login attempts. Please wait ${rateCheck.resetInSeconds} seconds before trying again.` }, // Rate limit error message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const body = await req.json(); // Parse request JSON payload
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = loginSchema.safeParse(body); // Validate payload schema
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid credentials provided"; // Extract first validation error
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400 response
    } // End validation check

    const { username, password } = parsed.data; // Destructure validated fields
    const result = await loginUser(username, password); // Execute authentication

    if (!result.success) { // Handle authentication failure
      return NextResponse.json({ error: result.error }, { status: 401 }); // Return 401 Unauthorized
    } // End auth failure

    return NextResponse.json({ success: true, user: result.user }); // Return successful response
  } catch (error) { // Catch unexpected errors
    console.error("POST /api/auth/login error:", error); // Log server error
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 }); // Return 500 response
  } // End try-catch
} // End POST handler
