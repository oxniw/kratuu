// ==============================================================================
// File: .//Description-of-file/auth_login_api.md
// Overview: Handles user credential verification and session initiation.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { loginUser } from "@/lib/auth/authService";

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    const result = await loginUser(username, password);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    return NextResponse.json({ success: true, user: result.user });
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Failed to authenticate" }, { status: 500 });
  }
}
