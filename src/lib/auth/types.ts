// ==============================================================================
// File: .//Description-of-file/auth_types.md
// Overview: Domain types and contracts for user authentication, accounts, and sessions.
// ==============================================================================

export interface User {
  id: string;
  username: string;
  display_name: string;
  email?: string | null;
  password_hash: string;
  salt: string;
  role: string;
  created_at: number;
}

export interface SafeUser {
  id: string;
  username: string;
  display_name: string;
  email?: string | null;
  role: string;
  created_at: number;
}

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
