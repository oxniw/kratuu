// ==============================================================================
// File: .//Description-of-file/role_api.md
// Overview: Role management API providing role retrieval, user role inspection, and role transitions.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server"; // Import Next.js request and response types
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { getSessionUser } from "@/lib/auth/authService"; // Import session user resolution helper
import { isValidRole, Role, VALID_ROLES, canModerate } from "@/lib/auth/roles"; // Import role predicates and types
import { hasMongoOperators } from "@/lib/security/mongoSanitizer"; // Import MongoDB operator injection guard
import { checkRateLimit, getClientIp } from "@/lib/security/rateLimiter"; // Import rate limiting utilities

export async function GET(req: NextRequest) { // Handles retrieving role metadata and user list for administrators
  try { // Begin processing
    const sessionUser = await getSessionUser(); // Retrieve authenticated session user
    if (!sessionUser) { // Guard against unauthenticated requests
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 }); // Return 401 Unauthorized
    } // End auth guard

    const db = await getDb(); // Connect to MongoDB database
    const isMod = canModerate(sessionUser.role); // Check if user holds moderator authority

    let usersList: Array<{ id: string; username: string; display_name: string; role: string }> = []; // Default empty list
    if (isMod) { // If user holds moderation role
      const rawUsers = await db // Query all users in system
        .collection("users") // Select users collection
        .find({}, { projection: { id: 1, username: 1, display_name: 1, role: 1 } }) // Limit returned fields
        .limit(50) // Limit to top 50 users
        .toArray(); // Resolve as array
      usersList = rawUsers.map((u) => ({ // Map raw users to safe objects
        id: String(u.id), // String ID
        username: String(u.username), // String username
        display_name: String(u.display_name || u.username), // String display name
        role: String(u.role || "user"), // Current assigned role
      })); // End mapping
    } // End if isMod

    return NextResponse.json({ // Return successful response
      success: true, // Success status flag
      currentRole: sessionUser.role, // Current user role
      availableRoles: VALID_ROLES, // List of system roles
      users: usersList, // Users list if moderator
    }); // End return
  } catch (error) { // Catch unexpected exceptions
    console.error("GET /api/auth/role error:", error); // Log error to console
    return NextResponse.json({ error: "Failed to fetch role data" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End GET

export async function POST(req: NextRequest) { // Handles updating a user role
  try { // Begin processing
    const clientIp = getClientIp(req); // Retrieve caller IP address
    const rateCheck = checkRateLimit(`role_update:${clientIp}`, { windowMs: 60 * 1000, maxRequests: 20 }); // Apply rate limit
    if (!rateCheck.allowed) { // If rate limit was exceeded
      return NextResponse.json( // Return 429 response
        { error: `Too many role requests. Please wait ${rateCheck.resetInSeconds} seconds.` }, // Rate limit error
        { status: 429 } // HTTP 429 status code
      ); // End return
    } // End rate check

    const sessionUser = await getSessionUser(); // Retrieve active session user
    if (!sessionUser) { // Guard against unauthenticated requests
      return NextResponse.json({ error: "กรุณาเข้าสู่ระบบก่อนเปลี่ยนสิทธิ์" }, { status: 401 }); // Return 401 Unauthorized
    } // End auth guard

    const body = await req.json(); // Parse request body JSON
    if (hasMongoOperators(body)) { // Check for MongoDB operator injection
      return NextResponse.json({ error: "Invalid request payload" }, { status: 400 }); // Reject malicious payload
    } // End injection check

    const { targetUserId, role } = body; // Destructure target user ID and new role
    if (!isValidRole(role)) { // Validate role against system allowlist
      return NextResponse.json( // Return 400 Bad Request
        { error: `บทบาทไม่ถูกต้อง ต้องเป็นหนึ่งใน: ${VALID_ROLES.join(", ")}` }, // Descriptive error
        { status: 400 } // HTTP 400 status code
      ); // End return
    } // End role check

    const targetId = typeof targetUserId === "string" && targetUserId.trim() ? targetUserId.trim() : sessionUser.id; // Default target to self
    const isSelf = targetId === sessionUser.id; // Check if user is updating their own role
    const isMod = canModerate(sessionUser.role); // Check if user is current moderator

    // Allow self-switch for development and role testing, or allow moderators to modify any user
    if (!isSelf && !isMod) { // Disallow regular users from modifying other accounts
      return NextResponse.json({ error: "คุณไม่มีสิทธิ์เปลี่ยนบทบาทของผู้ใช้อื่น" }, { status: 403 }); // Return 403 Forbidden
    } // End permission check

    const db = await getDb(); // Connect to MongoDB database
    const updateResult = await db.collection("users").updateOne( // Update role in database
      { id: String(targetId) }, // Filter by target user ID
      { $set: { role: String(role) } } // Set new role
    ); // End updateOne

    if (updateResult.matchedCount === 0) { // If user was not found
      return NextResponse.json({ error: "ไม่พบผู้ใช้ที่ระบุ" }, { status: 404 }); // Return 404 Not Found
    } // End matchedCount check

    // Also update any active thread records authored by this user to keep badges synchronized
    await db.collection("threads").updateMany( // Synchronize threads authored by this user
      { user_id: String(targetId) }, // Target user threads
      { $set: { author_role: String(role) } } // Update author role
    ); // End updateMany

    // Also update comments authored by this user
    await db.collection("comments").updateMany( // Synchronize comments authored by this user
      { user_id: String(targetId) }, // Target user comments
      { $set: { author_role: String(role) } } // Update author role
    ); // End updateMany

    return NextResponse.json({ // Return successful response
      success: true, // Success indicator
      userId: targetId, // Target user ID
      newRole: role, // Newly assigned role
      message: `เปลี่ยนบทบาทเป็น ${role.toUpperCase()} เรียบร้อยแล้ว`, // Confirmation message
    }); // End return
  } catch (error) { // Catch unexpected exceptions
    console.error("POST /api/auth/role error:", error); // Log error to console
    return NextResponse.json({ error: "Failed to update role" }, { status: 500 }); // Return 500 error
  } // End try-catch
} // End POST
