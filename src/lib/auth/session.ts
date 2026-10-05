// ==============================================================================
// File: .//Description-of-file/auth_session.md
// Overview: Database-backed session generator, cookie manager, and token validator.
// ==============================================================================

import crypto from "crypto";
import { cookies } from "next/headers";
import { getDb } from "@/lib/db";
import { SafeUser } from "./types";

export const SESSION_COOKIE_NAME = "kratuu_session";
const SESSION_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token = crypto.randomBytes(32).toString("hex");
  const sessionId = "s-" + Date.now().toString(36) + "-" + crypto.randomBytes(4).toString("hex");
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;

  await db.execute({
    sql: `
      INSERT INTO sessions (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [sessionId, userId, token, expiresAt, now],
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_MS / 1000,
  });

  return token;
}

export async function getCurrentUser(): Promise<SafeUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!token) return null;

    const db = await getDb();
    const now = Date.now();

    const res = await db.execute({
      sql: `
        SELECT u.id, u.username, u.display_name, u.email, u.role, u.created_at
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ? AND s.expires_at > ?
        LIMIT 1
      `,
      args: [token, now],
    });

    if (res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    return {
      id: String(row.id),
      username: String(row.username),
      display_name: String(row.display_name),
      email: row.email ? String(row.email) : null,
      role: String(row.role),
      created_at: Number(row.created_at),
    };
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (token) {
      const db = await getDb();
      await db.execute({
        sql: "DELETE FROM sessions WHERE token = ?",
        args: [token],
      });
    }
    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (err) {
    console.error("clearSession error:", err);
  }
}
