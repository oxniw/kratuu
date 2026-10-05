// ==============================================================================
// File: .//Description-of-file/google_auth.md
// Overview: Google OAuth 2.0 authorization, token exchange, and account synchronization.
// ==============================================================================

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { SafeUser } from "./types";

export interface GoogleUserProfile {
  sub: string; // Google User ID
  name: string;
  email: string;
  picture?: string;
}

export function isGoogleOAuthConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function generateOAuthState(): string {
  return crypto.randomBytes(24).toString("hex");
}

export function getGoogleAuthUrl(redirectUri: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  redirectUri: string
): Promise<GoogleUserProfile> {
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    const errorBody = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${errorBody}`);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;

  // Retrieve user profile
  const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userRes.ok) {
    throw new Error("Failed to fetch Google user profile");
  }

  const profile = await userRes.json();
  return {
    sub: String(profile.sub),
    name: String(profile.name || "Google User"),
    email: String(profile.email || ""),
    picture: profile.picture,
  };
}

export async function findOrCreateGoogleUser(profile: GoogleUserProfile): Promise<SafeUser> {
  const db = await getDb();
  const now = Date.now();

  // 1. Check if user already exists by google_id
  const byGoogleId = await db.execute({
    sql: "SELECT * FROM users WHERE google_id = ? LIMIT 1",
    args: [profile.sub],
  });

  if (byGoogleId.rows.length > 0) {
    const row = byGoogleId.rows[0];
    return {
      id: String(row.id),
      username: String(row.username),
      display_name: String(row.display_name),
      role: String(row.role || "user"),
      created_at: Number(row.created_at),
    };
  }

  // 2. Check if user exists by email to link account
  if (profile.email) {
    const byEmail = await db.execute({
      sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
      args: [profile.email.toLowerCase()],
    });

    if (byEmail.rows.length > 0) {
      const row = byEmail.rows[0];
      await db.execute({
        sql: "UPDATE users SET google_id = ? WHERE id = ?",
        args: [profile.sub, row.id],
      });

      return {
        id: String(row.id),
        username: String(row.username),
        display_name: String(row.display_name),
        role: String(row.role || "user"),
        created_at: Number(row.created_at),
      };
    }
  }

  // 3. Create new user from Google profile
  const userId = "u-g-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
  const rawBaseName = profile.email ? profile.email.split("@")[0] : profile.name;
  const sanitizedUsername = rawBaseName.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 15).toLowerCase();
  const uniqueUsername = `${sanitizedUsername || "user"}_${Math.floor(100 + Math.random() * 900)}`;
  const displayName = profile.name.slice(0, 30);

  const placeholderHash = "oauth_google_" + crypto.randomBytes(16).toString("hex");
  const placeholderSalt = crypto.randomBytes(8).toString("hex");

  await db.execute({
    sql: `
      INSERT INTO users (id, username, display_name, email, google_id, password_hash, salt, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'user', ?)
    `,
    args: [userId, uniqueUsername, displayName, profile.email?.toLowerCase() || null, profile.sub, placeholderHash, placeholderSalt, now],
  });

  return {
    id: userId,
    username: uniqueUsername,
    display_name: displayName,
    role: "user",
    created_at: now,
  };
}
