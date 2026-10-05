// ==============================================================================
// File: .//Description-of-file/auth_register_api.md
// Overview: Handles user registration HTTP requests.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { registerUser } from "@/lib/auth/authService";

export async function POST(req: NextRequest) {
  try {
    const { username, display_name, email, password } = await req.json();
    const result = await registerUser(username, display_name, password, email);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 201 });
  } catch (error) {
    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
  }
}
