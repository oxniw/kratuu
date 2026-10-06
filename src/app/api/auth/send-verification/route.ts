// ==============================================================================
// File: .//Description-of-file/auth_send_verification_api.md
// Overview: Endpoint to send a 6-digit registration verification code with rate limiting and injection guards.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js HTTP request and response types
import { verifyRealEmail } from "@/lib/auth/emailValidator"; // Import real email DNS verifier
import { checkEmailExists } from "@/lib/auth/authService"; // Import database email existence checker
import { sendVerificationCode } from "@/lib/auth/verificationService"; // Import verification code sender
import { getDb } from "@/lib/db"; // Import database accessor
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import NoSQL operator detector
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities
import { sendVerificationSchema } from "@/lib/security/schemas"; // Import runtime validation contract

export async function POST(req: NextRequest) { // Handle POST request to dispatch 6-digit verification code
  try { // Begin request processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const rateCheck = checkRateLimit(`send_otp:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 3 }); // Rate limit 3 code requests per minute
    if (!rateCheck.allowed) { // If rate threshold is exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `Too many verification requests. Please wait ${rateCheck.resetInSeconds} seconds before requesting another code.` }, // Rate limit message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const body = await req.json(); // Extract payload
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection payload
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End operator check

    const parsed = sendVerificationSchema.safeParse(body); // Validate schema
    if (!parsed.success) { // Handle validation error
      const issue = parsed.error.issues[0]?.message || "Invalid email provided"; // Extract message
      return NextResponse.json({ error: issue }, { status: 400 }); // Return 400
    } // End validation check

    const { email, username } = parsed.data; // Extract validated email and optional username

    // 1. Verify that email is a real domain that can receive mail
    const realCheck = await verifyRealEmail(email); // Run DNS and syntax verification
    if (!realCheck.isValid) { // If email domain is invalid or non-existent
      return NextResponse.json({ error: realCheck.message }, { status: 400 }); // Return real check failure
    } // End real check

    // 2. Verify that email is not already registered
    const dbEmailCheck = await checkEmailExists(email); // Check MongoDB users collection
    if (dbEmailCheck.exists) { // If email is already present
      return NextResponse.json( // Return conflict error
        { error: "This email is already registered in the database." }, // English error message
        { status: 400 } // Bad request
      ); // End return
    } // End dbEmailCheck

    // 3. Verify that username is not already taken if provided
    if (username) { // If username was provided
      const cleanUsername = String(username).trim().toLowerCase(); // Normalize username
      const db = await getDb(); // Access MongoDB database
      const existingUser = await db.collection("users").findOne({ // Query username uniqueness safely
        username: cleanUsername, // Safe primitive string query
      }); // End findOne
      if (existingUser) { // If username already exists
        return NextResponse.json( // Return username error
          { error: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น" }, // Localized message
          { status: 400 } // Bad request
        ); // End return
      } // End existingUser check
    } // End username check

    // 4. Generate 6-digit code and dispatch email
    const sendResult = await sendVerificationCode(email); // Dispatch verification email
    if (!sendResult.success) { // If code generation failed
      return NextResponse.json({ error: sendResult.message }, { status: 500 }); // Return error response
    } // End failure check

    return NextResponse.json({ // Return successful response
      success: true, // Success flag
      message: `A 6-digit verification code has been sent to ${email}.`, // Confirmation message
      debugCode: sendResult.debugCode, // Optional debug code in local dev environment
    }); // End return
  } catch (error) { // Catch unexpected exceptions
    console.error("POST /api/auth/send-verification error:", error); // Log error to console
    return NextResponse.json( // Return internal error
      { error: "Failed to send verification code. Please try again." }, // English error message
      { status: 500 } // HTTP 500 Internal Server Error
    ); // End return
  } // End try-catch
} // End POST handler
