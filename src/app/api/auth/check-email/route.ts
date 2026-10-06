// ==============================================================================
// File: .//Description-of-file/auth_check_email_api.md
// Overview: Endpoint to verify email syntax, DNS reachability, and database existence with rate limiting.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response objects
import { checkEmailExists } from "@/lib/auth/authService"; // Import checkEmailExists service function
import { verifyRealEmail } from "@/lib/auth/emailValidator"; // Import verifyRealEmail DNS validator
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiter utilities

export async function GET(req: NextRequest) { // Handle GET request to verify email validity and database presence
  try { // Begin request processing try block
    const clientIp = getClientIp(req); // Resolve caller IP address
    const rateCheck = checkRateLimit(`check_email:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 30 }); // Rate limit 30 checks per minute
    if (!rateCheck.allowed) { // If rate threshold is exceeded
      return NextResponse.json( // Return 429 Too Many Requests
        { error: `Too many email verification requests. Please wait ${rateCheck.resetInSeconds} seconds.` }, // Rate limit message
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const { searchParams } = new URL(req.url); // Parse URL search parameters from incoming request
    const rawEmail = searchParams.get("email"); // Extract email parameter from query string

    if (!rawEmail || typeof rawEmail !== "string") { // Check if email parameter is missing
      return NextResponse.json( // Return bad request response
        { error: "Email query parameter is required." }, // English error message
        { status: 400 } // HTTP 400 Bad Request
      ); // End return
    } // End email check

    const email = rawEmail.trim().toLowerCase(); // Sanitize primitive email string
    if (email.startsWith("$") || email.includes(".")) { // Basic format sanity
      const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard regex
      if (!EMAIL_REGEX.test(email)) { // Reject invalid email syntax
        return NextResponse.json({ isReal: false, exists: false, message: "Invalid email format." }); // Return syntax error
      } // End regex check
    } // End basic check

    // 1. Check if email is a real email with an active domain and mail exchange servers
    const realCheck = await verifyRealEmail(email); // Run DNS and syntax verification
    if (!realCheck.isValid) { // If email domain is fake, non-existent, or invalid
      return NextResponse.json({ // Return real email verification failure
        isReal: false, // Mark as not a real email
        exists: false, // Not checked in database
        message: realCheck.message, // Descriptive English reason
      }); // End return
    } // End real check

    // 2. Check if email exists in database
    const dbResult = await checkEmailExists(email); // Query MongoDB users collection safely
    if (dbResult.exists) { // If email already exists in database
      return NextResponse.json({ // Return already registered response
        isReal: true, // It is a real email
        exists: true, // Already registered
        message: "This email is already registered in the database.", // English registered message
      }); // End return
    } // End exists check

    return NextResponse.json({ // Return completely valid and available response
      isReal: true, // It is a real email
      exists: false, // Not in database
      message: "Verified real email address. Available for registration.", // English success message
    }); // End return
  } catch (error) { // Catch unexpected errors
    console.error("GET /api/auth/check-email error:", error); // Log error to console
    return NextResponse.json( // Return internal server error response
      { error: "Failed to verify email." }, // English error message
      { status: 500 } // HTTP 500 Internal Server Error
    ); // End return
  } // End try-catch block
} // End GET handler
