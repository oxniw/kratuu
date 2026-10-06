// ==============================================================================
// File: .//Description-of-file/timing_safe.md
// Overview: Cryptographic constant-time string comparison utility preventing side-channel timing attacks.
// ==============================================================================

import crypto from "crypto"; // Import Node.js crypto module for timing-safe equality

export function safeCompareStrings(a: string, b: string): boolean { // Compares two strings in constant time to prevent timing leakage
  if (typeof a !== "string" || typeof b !== "string") { // Validate string inputs
    return false; // Reject non-string comparisons
  } // End string check
  const bufA = Buffer.from(a, "utf-8"); // Convert first string to byte buffer
  const bufB = Buffer.from(b, "utf-8"); // Convert second string to byte buffer
  if (bufA.length !== bufB.length) { // Check buffer lengths
    return false; // Return false on length mismatch
  } // End length check
  return crypto.timingSafeEqual(bufA, bufB); // Execute constant-time buffer comparison
} // End safeCompareStrings
