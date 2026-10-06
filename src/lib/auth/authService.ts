// ==============================================================================
// File: .//Description-of-file/auth_service.md
// Overview: Business service orchestrating registration, credential authentication, and sessions using MongoDB.
// ==============================================================================

import crypto from "crypto"; // Import Node crypto module for user ID generation
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { hashPassword, verifyPassword } from "./password"; // Import password hashing utilities
import { createSession, clearSession, getCurrentUser } from "./session"; // Import session management functions
import { AuthResult, SafeUser } from "./types"; // Import auth result and user types
import { verifyRealEmail } from "./emailValidator"; // Import real email DNS verifier

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/; // Standard alphanumeric username pattern

export async function registerUser( // Registers a new user account in MongoDB
  usernameRaw: string, // Submitted username
  displayNameRaw: string, // Submitted display name
  passwordRaw: string, // Submitted plain password
  emailRaw?: string // Optional verified email address
): Promise<AuthResult> {
  const username = typeof usernameRaw === "string" ? usernameRaw.trim().toLowerCase() : ""; // Normalize username primitive
  const displayName = typeof displayNameRaw === "string" && displayNameRaw.trim() ? displayNameRaw.trim() : username; // Normalize display name
  const password = typeof passwordRaw === "string" ? passwordRaw : ""; // Normalize password
  const email = typeof emailRaw === "string" && emailRaw.trim() ? emailRaw.trim().toLowerCase() : null; // Normalize email

  if (!username || !USERNAME_REGEX.test(username)) { // Validate username format
    return {
      success: false,
      error: "ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) ความยาว 3-20 ตัวอักษร",
    };
  }

  if (email) { // If email was supplied, perform real email validation
    const realCheck = await verifyRealEmail(email); // Run DNS and syntax verification
    if (!realCheck.isValid) { // If email is invalid
      return {
        success: false,
        error: realCheck.message,
      };
    }
  }

  if (!displayName || displayName.length < 1 || displayName.length > 30) { // Validate display name length
    return {
      success: false,
      error: "ชื่อที่แสดงต้องมีความยาวระหว่าง 1-30 ตัวอักษร",
    };
  }

  if (!password || password.length < 6) { // Validate minimum password length
    return {
      success: false,
      error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
    };
  }

  const db = await getDb(); // Retrieve MongoDB database instance

  // Check username uniqueness in MongoDB
  const existing = await db.collection("users").findOne({ username: String(username) }); // Query by username
  if (existing) { // If username already exists
    return {
      success: false,
      error: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น",
    };
  }

  // Check email uniqueness if email is provided
  if (email) { // Check email condition
    const existingEmail = await db.collection("users").findOne({ email: String(email) }); // Query by email
    if (existingEmail) { // If email is already registered
      return {
        success: false,
        error: "This email is already registered in the database.",
      };
    }
  }

  const userId = "u-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex"); // Generate user ID
  const { hash, salt } = hashPassword(password); // Hash password with salt
  const now = Date.now(); // Current timestamp

  await db.collection("users").insertOne({ // Insert user document into MongoDB
    id: userId, // Unique ID
    username: String(username), // User handle
    display_name: String(displayName), // Display name
    email: email ? String(email) : null, // Email address or null
    password_hash: hash, // PBKDF2 hashed password
    salt: salt, // Cryptographic salt
    role: "user", // Default role
    created_at: now, // Creation timestamp
  }); // End insertOne

  await createSession(userId); // Establish authenticated session cookie

  const safeUser: SafeUser = { // Build sanitized user response
    id: userId,
    username,
    display_name: displayName,
    email: email || undefined,
    role: "user",
    created_at: now,
  };

  return { success: true, user: safeUser }; // Return successful result
} // End registerUser

export async function loginUser( // Authenticates user via username/email and password against MongoDB
  identifierRaw: string, // Submitted username or email
  passwordRaw: string // Submitted password
): Promise<AuthResult> {
  const identifier = typeof identifierRaw === "string" ? identifierRaw.trim().toLowerCase() : ""; // Normalize identifier
  const password = typeof passwordRaw === "string" ? passwordRaw : ""; // Normalize password

  if (!identifier || !password) { // Validate input presence
    return {
      success: false,
      error: "กรุณาระบุชื่อผู้ใช้/อีเมลล์และรหัสผ่าน",
    };
  }

  const db = await getDb(); // Retrieve MongoDB database instance
  const cleanId = String(identifier); // Ensure primitive string to prevent NoSQL operator injection

  // Search user by either username or email
  const user = await db.collection("users").findOne({ // Find matched user document
    $or: [{ username: cleanId }, { email: cleanId }], // Disjunction query
  }); // End findOne

  if (!user) { // Check if user was not found
    const isEmail = cleanId.includes("@"); // Determine if input looked like an email address
    return {
      success: false,
      error: isEmail
        ? "This email is not registered in the database. Please sign up first."
        : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  const isValid = verifyPassword(password, String(user.password_hash), String(user.salt)); // Verify password hash

  if (!isValid) { // If password mismatch
    return {
      success: false,
      error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  const userId = String(user.id); // Extract user ID
  await createSession(userId); // Create session and set cookie

  const safeUser: SafeUser = { // Build sanitized user profile
    id: userId,
    username: String(user.username),
    display_name: String(user.display_name),
    email: user.email ? String(user.email) : undefined,
    role: String(user.role || "user"),
    created_at: Number(user.created_at),
  };

  return { success: true, user: safeUser }; // Return success
} // End loginUser

export async function logoutUser(): Promise<void> { // Logs out the active user session
  await clearSession(); // Invalidate session
} // End logoutUser

export async function getSessionUser(): Promise<SafeUser | null> { // Convenience helper to resolve current user
  return await getCurrentUser(); // Delegate to session resolver
} // End getSessionUser

export async function checkEmailExists(emailRaw: string): Promise<{ // Checks if email exists in MongoDB users collection
  exists: boolean;
  message: string;
}> {
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""; // Normalize email
  if (!email) { // Check if email is empty
    return {
      exists: false,
      message: "Email address is required.",
    };
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Standard email regex
  if (!EMAIL_REGEX.test(email)) { // Check email format
    return {
      exists: false,
      message: "Invalid email format.",
    };
  }

  const db = await getDb(); // Retrieve MongoDB database instance
  const existing = await db.collection("users").findOne({ email: String(email) }); // Query users collection
  const exists = Boolean(existing); // Compute boolean existence flag

  return {
    exists,
    message: exists
      ? "This email is already registered in the database."
      : "This email is available.",
  };
} // End checkEmailExists
