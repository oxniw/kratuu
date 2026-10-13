// ==============================================================================
// File: .//Description-of-file/roles.md
// Overview: Role definitions, permission checks, and badge formatters for admin, user, and dev.
// ==============================================================================

export type Role = "admin" | "user" | "dev"; // Union of supported user roles in the system

export const VALID_ROLES: readonly Role[] = ["user", "admin", "dev"] as const; // Explicit allowlist of all valid roles

export function isValidRole(role: unknown): role is Role { // Type-guard verifying if arbitrary input matches valid role
  return typeof role === "string" && (VALID_ROLES as readonly string[]).includes(role); // Check string membership
} // End isValidRole

export function canModerate(role?: string | null): boolean { // Checks if role holds moderation authority
  return role === "admin" || role === "dev"; // Admins and developers have moderation privileges
} // End canModerate

export function isDevRole(role?: string | null): boolean { // Checks if role holds developer authority
  return role === "dev"; // True exclusively for developer accounts
} // End isDevRole

export function isAdminRole(role?: string | null): boolean { // Checks if role holds admin authority
  return role === "admin"; // True exclusively for administrator accounts
} // End isAdminRole

export function getRoleBadgeInfo(role?: string | null): { // Returns display badge metadata for UI components
  label: string; // Text badge label
  tag: string; // Bracketed mono tag string
  description: string; // Human-readable role description
  className: string; // Tailwind styling classes
} {
  switch (role) { // Match incoming role string
    case "dev": // Developer role
      return { // Developer badge metadata
        label: "DEV", // Uppercase label
        tag: "[DEV]", // Bracketed tag
        description: "ผู้พัฒนาระบบ (System Developer)", // Thai descriptive title
        className: "bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-bold font-mono text-[10px] px-1 py-0.5 tracking-wider", // High-contrast inverted badge styling
      }; // End dev
    case "admin": // Admin role
      return { // Admin badge metadata
        label: "ADMIN", // Uppercase label
        tag: "[ADMIN]", // Bracketed tag
        description: "ผู้ดูแลระบบ (Administrator)", // Thai descriptive title
        className: "border-2 border-black dark:border-white font-black font-mono text-[10px] px-1 py-0.5 tracking-wider", // Thick border styling
      }; // End admin
    default: // Standard user or guest
      return { // Default user badge metadata
        label: "USER", // Uppercase label
        tag: "[USER]", // Bracketed tag
        description: "สมาชิกทั่วไป (Member)", // Thai descriptive title
        className: "border border-neutral-400 dark:border-neutral-600 font-mono text-[10px] px-1 py-0.5 text-neutral-600 dark:text-neutral-400", // Subtle border styling
      }; // End default
  } // End switch
} // End getRoleBadgeInfo
