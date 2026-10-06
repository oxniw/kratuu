// ==============================================================================
// File: .//Description-of-file/security_schemas.md
// Overview: Zod runtime validation schemas enforcing strict payload contracts and rejecting malformed inputs.
// ==============================================================================

import { z } from "zod"; // Import Zod schema validation library

export const loginSchema = z.object({ // Validation contract for user login credentials
  username: z.string().trim().min(1, "กรุณาระบุชื่อผู้ใช้").max(100), // Username or email string
  password: z.string().min(1, "กรุณาระบุรหัสผ่าน").max(128), // Password string
}); // End loginSchema

export const registerSchema = z.object({ // Validation contract for user account creation
  username: z.string().trim().toLowerCase().regex(/^[a-zA-Z0-9_]{3,20}$/, "ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) ความยาว 3-20 ตัวอักษร"), // Username format
  display_name: z.string().trim().min(1, "ชื่อที่แสดงต้องมีความยาวระหว่าง 1-30 ตัวอักษร").max(30), // Display name
  password: z.string().min(6, "รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร").max(100), // Password bounds
  email: z.string().trim().toLowerCase().email("รูปแบบอีเมลไม่ถูกต้อง").optional().nullable(), // Optional email
}); // End registerSchema

export const sendVerificationSchema = z.object({ // Validation contract for dispatching verification OTP
  email: z.string().trim().toLowerCase().email("Invalid email format"), // Target recipient email
  username: z.string().trim().max(50).optional().nullable(), // Optional associated username
}); // End sendVerificationSchema

export const verifyCodeSchema = z.object({ // Validation contract for 6-digit OTP verification and registration
  email: z.string().trim().toLowerCase().email("Invalid email address"), // User email
  code: z.string().trim().regex(/^\d{6}$/, "Verification code must be 6 digits"), // 6-digit verification code
  username: z.string().trim().toLowerCase().regex(/^[a-zA-Z0-9_]{3,20}$/, "ชื่อผู้ใช้ต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือขีดล่าง (_) ความยาว 3-20 ตัวอักษร"), // Username
  display_name: z.string().trim().min(1).max(30), // Display name
  password: z.string().min(6).max(100), // Password
}); // End verifyCodeSchema

export const createThreadSchema = z.object({ // Validation contract for creating new discussion threads
  title: z.string().trim().min(5, "หัวข้อกระทู้ต้องมีความยาวอย่างน้อย 5 ตัวอักษร").max(150, "หัวข้อกระทู้ต้องไม่เกิน 150 ตัวอักษร"), // Thread title
  content: z.string().trim().min(1, "เนื้อหากระทู้ต้องไม่ว่างเปล่า").max(15000, "เนื้อหากระทู้ยาวเกินกำหนด"), // Thread body
  category: z.string().trim().max(50).optional(), // Category name
  tags: z.array(z.string().trim().max(30)).max(10).optional(), // Tags list
  author_name: z.string().trim().max(30).optional(), // Optional author alias
  author_pin: z.string().trim().max(20).optional().nullable(), // Optional deletion PIN
}); // End createThreadSchema

export const createCommentSchema = z.object({ // Validation contract for posting replies and comments
  content: z.string().trim().min(1, "ข้อความความคิดเห็นต้องไม่ว่างเปล่า").max(5000, "ความคิดเห็นยาวเกินกำหนด"), // Comment content
  parent_id: z.string().trim().max(100).optional().nullable(), // Parent comment identifier for nesting
  author_name: z.string().trim().max(30).optional(), // Optional author alias
  author_pin: z.string().trim().max(20).optional().nullable(), // Optional comment PIN
}); // End createCommentSchema

export const voteSchema = z.object({ // Validation contract for voting operations
  target_id: z.string().trim().min(1, "Target ID is required").max(100), // Target thread or comment ID
  target_type: z.enum(["thread", "comment"]), // Permitted entity types
  vote_type: z.union([z.literal(1), z.literal(-1)]), // Permitted vote actions: 1 (upvote) or -1 (downvote)
}); // End voteSchema

export const deleteThreadSchema = z.object({ // Validation contract for thread deletion requests
  pin: z.string().trim().max(30).optional(), // Deletion PIN
}); // End deleteThreadSchema
