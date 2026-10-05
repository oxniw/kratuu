// ==============================================================================
// File: .//Description-of-file/google_init_api.md
// Overview: Initiates Google OAuth flow or developer demo simulation.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  generateOAuthState,
  getGoogleAuthUrl,
  isGoogleOAuthConfigured,
  findOrCreateGoogleUser,
} from "@/lib/auth/googleAuth";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  // If live credentials are not set, provide simulated Google login in development
  if (!isGoogleOAuthConfigured()) {
    const demoProfile = {
      sub: "google-demo-" + Date.now().toString(36),
      name: "ผู้ใช้ Google ทดสอบ",
      email: "google_user@example.com",
    };

    const user = await findOrCreateGoogleUser(demoProfile);
    await createSession(user.id);
    return NextResponse.redirect(`${origin}/?auth_provider=google&notice=demo_mode`);
  }

  const state = generateOAuthState();
  const cookieStore = await cookies();

  // Save CSRF state in secure HTTP-only cookie
  cookieStore.set("kratuu_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  const authUrl = getGoogleAuthUrl(redirectUri, state);
  return NextResponse.redirect(authUrl);
}
