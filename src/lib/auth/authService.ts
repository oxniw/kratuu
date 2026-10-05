// ==============================================================================
// File: .//Description-of-file/auth_service.md
// Overview: Business service orchestrating registration, credential authentication, and sessions.
// ==============================================================================

import crypto from "crypto";
import { getDb } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password";
import { createSession, clearSession, getCurrentUser } from "./session";
import { AuthResult, SafeUser } from "./types";
import { verifyRealEmail } from "./emailValidator";

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export async function registerUser(
  usernameRaw: string,
  displayNameRaw: string,
  passwordRaw: string,
  emailRaw?: string
): Promise<AuthResult> {
  const username = usernameRaw?.trim().toLowerCase();
  const displayName = displayNameRaw?.trim() || username;
  const password = passwordRaw;
  const email = emailRaw?.trim().toLowerCase() || null;

  if (!username || !USERNAME_REGEX.test(username)) {
    return {
      success: false,
      error: "ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) ความยาว 3-20 ตัวอักษร",
    };
  }

  if (email) {
    const realCheck = await verifyRealEmail(email);
    if (!realCheck.isValid) {
      return {
        success: false,
        error: realCheck.message,
      };
    }
  }

  if (!displayName || displayName.length < 1 || displayName.length > 30) {
    return {
      success: false,
      error: "ชื่อที่แสดงต้องมีความยาวระหว่าง 1-30 ตัวอักษร",
    };
  }

  if (!password || password.length < 6) {
    return {
      success: false,
      error: "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร",
    };
  }

  const db = await getDb();

  // Check username uniqueness
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE username = ? LIMIT 1",
    args: [username],
  });

  if (existing.rows.length > 0) {
    return {
      success: false,
      error: "ชื่อผู้ใช้นี้ถูกใช้งานแล้ว กรุณาเลือกชื่ออื่น",
    };
  }

  // Check email uniqueness if email provided
  if (email) {
    const existingEmail = await db.execute({
      sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
      args: [email],
    });
    if (existingEmail.rows.length > 0) {
      return {
        success: false,
        error: "This email is already registered in the database.",
      };
    }
  }

  const userId = "u-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
  const { hash, salt } = hashPassword(password);
  const now = Date.now();

  await db.execute({
    sql: `
      INSERT INTO users (id, username, display_name, email, password_hash, salt, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'user', ?)
    `,
    args: [userId, username, displayName, email, hash, salt, now],
  });

  await createSession(userId);

  const safeUser: SafeUser = {
    id: userId,
    username,
    display_name: displayName,
    email: email || undefined,
    role: "user",
    created_at: now,
  };

  return { success: true, user: safeUser };
}

export async function loginUser(
  identifierRaw: string,
  passwordRaw: string
): Promise<AuthResult> {
  const identifier = identifierRaw?.trim().toLowerCase();
  const password = passwordRaw;

  if (!identifier || !password) {
    return {
      success: false,
      error: "กรุณาระบุชื่อผู้ใช้/อีเมลล์และรหัสผ่าน",
    };
  }

  const db = await getDb();

  const userRes = await db.execute({
    sql: "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
    args: [identifier, identifier],
  });

  if (userRes.rows.length === 0) {
    const isEmail = identifier.includes("@");
    return {
      success: false,
      error: isEmail
        ? "This email is not registered in the database. Please sign up first."
        : "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  const row = userRes.rows[0];
  const isValid = verifyPassword(password, String(row.password_hash), String(row.salt));

  if (!isValid) {
    return {
      success: false,
      error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  const userId = String(row.id);
  await createSession(userId);

  const safeUser: SafeUser = {
    id: userId,
    username: String(row.username),
    display_name: String(row.display_name),
    email: row.email ? String(row.email) : undefined,
    role: String(row.role),
    created_at: Number(row.created_at),
  };

  return { success: true, user: safeUser };
}

export async function logoutUser(): Promise<void> {
  await clearSession();
}

export async function getSessionUser(): Promise<SafeUser | null> {
  return await getCurrentUser();
}

export async function checkEmailExists(emailRaw: string): Promise<{
  exists: boolean;
  message: string;
}> {
  const email = emailRaw?.trim().toLowerCase();
  if (!email) {
    return {
      exists: false,
      message: "Email address is required.",
    };
  }

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(email)) {
    return {
      exists: false,
      message: "Invalid email format.",
    };
  }

  const db = await getDb();
  const existing = await db.execute({
    sql: "SELECT id FROM users WHERE email = ? LIMIT 1",
    args: [email],
  });

  const exists = existing.rows.length > 0;
  return {
    exists,
    message: exists
      ? "This email is already registered in the database."
      : "This email is available.",
  };
}
