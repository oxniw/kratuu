// ==============================================================================
// File: .//Description-of-file/auth_types.md
// Overview: Domain types and contracts for user authentication, accounts, and sessions.
// ==============================================================================

import { Role } from "./roles"; // Import domain Role type
export type { Role }; // Re-export Role type for external consumers

export interface User { // Database user entity interface
  id: string; // Unique user identifier
  username: string; // Unique alphanumeric login handle
  display_name: string; // Public display name
  email?: string | null; // Optional verified email
  password_hash: string; // Hashed password
  salt: string; // Password salt
  role: Role; // User role in the system: admin, user, dev
  created_at: number; // Registration timestamp
} // End User

export interface SafeUser { // Sanitized user entity for public client transmission
  id: string; // Unique user identifier
  username: string; // Unique alphanumeric login handle
  display_name: string; // Public display name
  email?: string | null; // Optional verified email
  role: Role; // User role in the system: admin, user, dev
  created_at: number; // Registration timestamp
} // End SafeUser

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: number;
  created_at: number;
}

export interface AuthResult {
  success: boolean;
  user?: SafeUser;
  error?: string;
}
