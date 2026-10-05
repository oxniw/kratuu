// ==============================================================================
// File: .//Description-of-file/auth_session.md
// Overview: Database-backed session generator, cookie manager, and token validator using MongoDB.
// ==============================================================================

import crypto from "crypto"; // Import Node crypto module for session token generation
import { cookies } from "next/headers"; // Import Next.js headers cookies helper
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { SafeUser } from "./types"; // Import SafeUser interface

export const SESSION_COOKIE_NAME = "kratuu_session"; // Session cookie key name
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days session duration in milliseconds

export async function createSession(userId: string): Promise<string> { // Creates a session in MongoDB and sets cookie
  const db = await getDb(); // Retrieve MongoDB database instance
  const token = crypto.randomBytes(32).toString("hex"); // Generate 64-character random token
  const sessionId = "s-" + Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex"); // Generate session ID
  const now = Date.now(); // Current timestamp
  const expiresAt = now + SESSION_DURATION_MS; // Compute expiration timestamp

  await db.collection("sessions").insertOne({ // Insert session document into sessions collection
    id: sessionId, // Unique session identifier
    user_id: String(userId), // Associated user ID
    token: String(token), // Secure token string
    expires_at: expiresAt, // Expiration timestamp
    created_at: now, // Creation timestamp
  }); // End insertOne

  const cookieStore = await cookies(); // Await Next.js cookie store
  cookieStore.set(SESSION_COOKIE_NAME, token, { // Set session cookie in client browser
    httpOnly: true, // Prevent JavaScript client access
    secure: process.env.NODE_ENV === "production", // Require HTTPS in production
    sameSite: "lax", // Protect against CSRF while permitting top-level navigation
    path: "/", // Available application-wide
    maxAge: SESSION_DURATION_MS / 1000, // Maximum age in seconds
  }); // End cookieStore.set

  return token; // Return token string
} // End createSession

export async function getCurrentUser(): Promise<SafeUser | null> { // Resolves user from active session cookie
  try { // Begin resolution try block
    const cookieStore = await cookies(); // Await cookie store
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; // Read session token from cookie
    if (!token) return null; // Return null if no token is present

    const db = await getDb(); // Retrieve MongoDB database instance
    const now = Date.now(); // Current timestamp

    // Find active non-expired session
    const session = await db.collection("sessions").findOne({ // Query session document
      token: String(token), // Match token primitive
      expires_at: { $gt: now }, // Ensure session has not expired
    }); // End findOne

    if (!session || !session.user_id) { // Check if session was not found
      return null; // Return null
    } // End check

    // Find user by session user_id
    const user = await db.collection("users").findOne({ // Query user document
      id: String(session.user_id), // Match user ID
    }); // End findOne

    if (!user) { // Check if user was not found
      return null; // Return null
    } // End check

    return { // Return sanitized user object
      id: String(user.id), // User identifier
      username: String(user.username), // User handle
      display_name: String(user.display_name), // Display name
      email: user.email ? String(user.email) : undefined, // Email address
      role: String(user.role || "user"), // Account role
      created_at: Number(user.created_at), // Creation timestamp
    }; // End return
  } catch (err) { // Catch unexpected errors
    console.error("getCurrentUser error:", err); // Log error
    return null; // Return null on failure
  } // End try-catch
} // End getCurrentUser

export async function clearSession(): Promise<void> { // Invalidates active session and removes cookie
  try { // Begin cleanup try block
    const cookieStore = await cookies(); // Await cookie store
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value; // Read cookie token
    if (token) { // If token exists
      const db = await getDb(); // Access database
      await db.collection("sessions").deleteOne({ // Remove session from MongoDB
        token: String(token), // Match token
      }); // End deleteOne
    } // End check
    cookieStore.delete(SESSION_COOKIE_NAME); // Delete cookie in client browser
  } catch (err) { // Catch cleanup errors
    console.error("clearSession error:", err); // Log error
  } // End try-catch
} // End clearSession
