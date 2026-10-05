// ==============================================================================
// File: .//Description-of-file/auth_logout_api.md
// Overview: Terminates user session and removes authentication cookies.
// ==============================================================================

import { NextResponse } from "next/server";
import { logoutUser } from "@/lib/auth/authService";

export async function POST() {
  try {
    await logoutUser();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/auth/logout error:", error);
    return NextResponse.json({ error: "Failed to log out" }, { status: 500 });
  }
}
