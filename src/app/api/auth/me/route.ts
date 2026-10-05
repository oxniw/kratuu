// ==============================================================================
// File: .//Description-of-file/auth_me_api.md
// Overview: Retrieves the currently authenticated session user profile.
// ==============================================================================

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/authService";

export async function GET() {
  try {
    const user = await getSessionUser();
    return NextResponse.json({ user });
  } catch (error) {
    console.error("GET /api/auth/me error:", error);
    return NextResponse.json({ user: null });
  }
}
