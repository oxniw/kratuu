// ==============================================================================
// File: .//Description-of-file/google_auth.md
// Overview: Google OAuth 2.0 authorization, token exchange, and account synchronization with MongoDB.
// ==============================================================================

import crypto from "crypto"; // Import crypto module for OAuth state and placeholder generation
import { getDb } from "@/lib/db"; // Import MongoDB database accessor
import { SafeUser } from "./types"; // Import SafeUser type

export interface GoogleUserProfile { // Google profile data structure
  sub: string; // Google user ID
  name: string; // User full name
  email: string; // Verified email address
  picture?: string; // Optional avatar URL
}

export function isGoogleOAuthConfigured(): boolean { // Checks if OAuth credentials are set
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function generateOAuthState(): string { // Generates random OAuth state parameter
  return crypto.randomBytes(24).toString("hex");
}

export function getGoogleAuthUrl(redirectUri: string, state: string): string { // Constructs Google OAuth consent screen URL
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

export async function exchangeGoogleCode( // Exchanges auth code for tokens and fetches user info
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

export async function findOrCreateGoogleUser(profile: GoogleUserProfile): Promise<SafeUser> { // Finds existing user or registers new Google account in MongoDB
  const db = await getDb(); // Retrieve MongoDB database instance
  const now = Date.now(); // Current timestamp

  // 1. Check if user already exists by google_id
  const byGoogleId = await db.collection("users").findOne({ google_id: String(profile.sub) }); // Query by google_id
  if (byGoogleId) { // If user exists
    return {
      id: String(byGoogleId.id),
      username: String(byGoogleId.username),
      display_name: String(byGoogleId.display_name),
      email: byGoogleId.email ? String(byGoogleId.email) : undefined,
      role: String(byGoogleId.role || "user"),
      created_at: Number(byGoogleId.created_at),
    };
  }

  // 2. Check if user exists by email to link account
  if (profile.email) {
    const cleanEmail = profile.email.toLowerCase();
    const byEmail = await db.collection("users").findOne({ email: cleanEmail });
    if (byEmail) {
      await db.collection("users").updateOne(
        { id: byEmail.id },
        { $set: { google_id: String(profile.sub) } }
      );

      return {
        id: String(byEmail.id),
        username: String(byEmail.username),
        display_name: String(byEmail.display_name),
        email: byEmail.email ? String(byEmail.email) : undefined,
        role: String(byEmail.role || "user"),
        created_at: Number(byEmail.created_at),
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

  await db.collection("users").insertOne({
    id: userId,
    username: uniqueUsername,
    display_name: displayName,
    email: profile.email ? profile.email.toLowerCase() : null,
    google_id: String(profile.sub),
    password_hash: placeholderHash,
    salt: placeholderSalt,
    role: "user",
    created_at: now,
  });

  return {
    id: userId,
    username: uniqueUsername,
    display_name: displayName,
    email: profile.email ? profile.email.toLowerCase() : undefined,
    role: "user",
    created_at: now,
  };
}
