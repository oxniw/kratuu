// ==============================================================================
// File: .//Description-of-file/google_callback_api.md
// Overview: Handles Google OAuth 2.0 authorization code exchange and user login.
// ==============================================================================

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeGoogleCode, findOrCreateGoogleUser } from "@/lib/auth/googleAuth";
import { createSession } from "@/lib/auth/session";

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/google/callback`;

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/?auth_error=google_cancelled`);
  }

  // Verify CSRF state token
  const cookieStore = await cookies();
  const storedState = cookieStore.get("kratuu_oauth_state")?.value;
  cookieStore.delete("kratuu_oauth_state");

  if (!storedState || storedState !== state) {
    return NextResponse.redirect(`${origin}/?auth_error=invalid_state`);
  }

  try {
    const profile = await exchangeGoogleCode(code, redirectUri);
    const user = await findOrCreateGoogleUser(profile);
    await createSession(user.id);

    return NextResponse.redirect(`${origin}/?auth_provider=google`);
  } catch (err) {
    console.error("Google OAuth callback error:", err);
    return NextResponse.redirect(`${origin}/?auth_error=google_failed`);
  }
}
