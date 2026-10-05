// ==============================================================================
// File: .//Description-of-file/auth_verify_code_api.md
// Overview: Endpoint to verify the 6-digit registration OTP code and complete user sign-up.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response objects
import { verifyEmailCode } from "@/lib/auth/verificationService"; // Import code verification logic
import { registerUser } from "@/lib/auth/authService"; // Import user registration function

export async function POST(req: NextRequest) { // Handle POST request to verify 6-digit code and create user
  try { // Begin request processing try block
    const { email, code, username, display_name, password } = await req.json(); // Extract payload properties

    if (!email || !code) { // Check for required verification credentials
      return NextResponse.json( // Return bad request
        { error: "Email and 6-digit verification code are required." }, // English error message
        { status: 400 } // HTTP 400 Bad Request
      ); // End return
    } // End credentials check

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
