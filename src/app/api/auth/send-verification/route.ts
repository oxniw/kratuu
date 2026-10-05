// ==============================================================================
// File: .//Description-of-file/auth_send_verification_api.md
// Overview: Endpoint to send a 6-digit registration verification code to an email.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js HTTP request and response types
import { verifyRealEmail } from "@/lib/auth/emailValidator"; // Import real email DNS verifier
import { checkEmailExists } from "@/lib/auth/authService"; // Import database email existence checker
import { sendVerificationCode } from "@/lib/auth/verificationService"; // Import verification code sender
import { getDb } from "@/lib/db"; // Import database accessor

export async function POST(req: NextRequest) { // Handle POST request to dispatch 6-digit verification code
  try { // Begin request processing try block
    const { email, username } = await req.json(); // Extract email and username from JSON payload

    if (!email || typeof email !== "string") { // Validate email presence
      return NextResponse.json({ error: "Email is required." }, { status: 400 }); // Return missing email error
    } // End email check

    // 1. Verify that email is a real domain that can receive mail
    const realCheck = await verifyRealEmail(email); // Run DNS and syntax verification
    if (!realCheck.isValid) { // If email domain is invalid or non-existent
      return NextResponse.json({ error: realCheck.message }, { status: 400 }); // Return real check failure
    } // End real check

    // 2. Verify that email is not already registered
    const dbEmailCheck = await checkEmailExists(email); // Check SQLite users table
    if (dbEmailCheck.exists) { // If email is already present
      return NextResponse.json( // Return conflict error
        { error: "This email is already registered in the database." }, // English error message
        { status: 400 } // Bad request
      ); // End return
    } // End dbEmailCheck

    // 3. Verify that username is not already taken if provided
    if (username) { // If username was provided
      const db = await getDb(); // Access database
      const existingUser = await db.execute({ // Query username uniqueness
        sql: "SELECT id FROM users WHERE username = ? LIMIT 1", // SQL query
        args: [username.trim().toLowerCase()], // Lowercase username argument
      }); // End execute
      if (existingUser.rows.length > 0) { // If username already exists
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
