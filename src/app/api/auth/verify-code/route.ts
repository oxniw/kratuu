// ==============================================================================
// File: .//Description-of-file/auth_verify_code_api.md
// Overview: Endpoint to verify 6-digit registration OTP code with rate limiting, input validation, and injection guards.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response objects
import { verifyEmailCode } from "@/lib/auth/verificationService"; // Import code verification logic
import { registerUser } from "@/lib/auth/authService"; // Import user registration function
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { verifyCodeSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function POST(req: NextRequest) { // Handle POST request to verify 6-digit code and create user
  try { // Begin request processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const rateCheck = checkRateLimit(`verify_otp:${clientIp}`, { windowMs: 5 * 60 * 1000, maxRequests: 10 }); // Rate limit 10 verify attempts per 5 minutes
    if (!rateCheck.allowed) { // If rate threshold is exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `Too many verification attempts. Please wait ${rateCheck.resetInSeconds} seconds before trying again.` }, // Rate limit error
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const body = await req.json(); // Extract payload properties
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = verifyCodeSchema.safeParse(body); // Validate payload against schema
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid verification payload"; // Extract error message
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400
    } // End validation check

    const { email, code, username, display_name, password } = parsed.data; // Extract validated fields

    // 1. Validate submitted 6-digit code against database record
    const verifyResult = await verifyEmailCode(email, code); // Validate code in database
    if (!verifyResult.success) { // If code is invalid, expired, or attempts exhausted
      return NextResponse.json( // Return verification error
        { error: verifyResult.error || "Invalid verification code." }, // Error message
        { status: 400 } // HTTP 400 Bad Request
      ); // End return
    } // End verify check

    // 2. Code is verified: proceed with user registration and session creation
    const registerResult = await registerUser(username, display_name, password, email); // Register user account
    if (!registerResult.success) { // Check if registration failed
      return NextResponse.json( // Return registration error
        { error: registerResult.error || "Failed to register user." }, // Error message
        { status: 400 } // HTTP 400 Bad Request
      ); // End return
    } // End register check

    return NextResponse.json( // Return success with created safe user
      { success: true, user: registerResult.user }, // Payload with user
      { status: 201 } // HTTP 201 Created
    ); // End return
  } catch (error) { // Catch unexpected errors
    console.error("POST /api/auth/verify-code error:", error); // Log error to console
    return NextResponse.json( // Return internal server error
      { error: "Verification process encountered an error. Please try again." }, // Error message
      { status: 500 } // HTTP 500 Internal Server Error
    ); // End return
  } // End try-catch
} // End POST handler
