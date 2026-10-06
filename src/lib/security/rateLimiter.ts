// ==============================================================================
// File: .//Description-of-file/rate_limiter.md
// Overview: Sliding-window in-memory rate limiter protecting endpoints against brute force and resource exhaustion.
// ==============================================================================

import { NextRequest } from "next/server"; // Import NextRequest type

interface RateLimitRecord { // Storage record for request timestamps
  timestamps: number[]; // Array of timestamp epochs
} // End RateLimitRecord

const storage = new Map<string, RateLimitRecord>(); // Global in-memory storage map
let lastPrunedAt = Date.now(); // Timestamp of last pruning cycle

function pruneStaleRecords(windowMs: number): void { // Purges expired entries to prevent memory growth
  const now = Date.now(); // Current timestamp
  if (now - lastPrunedAt < 60000) { // Prune at most once per minute
    return; // Skip early cycle
  } // End frequency check
  lastPrunedAt = now; // Update cycle marker
  const cutoff = now - windowMs; // Calculate expiration cutoff
  for (const [key, record] of storage.entries()) { // Iterate through all stored keys
    const valid = record.timestamps.filter((ts) => ts > cutoff); // Filter recent timestamps
    if (valid.length === 0) { // If all timestamps expired
      storage.delete(key); // Remove entry from map
    } else { // Keep active records
      storage.set(key, { timestamps: valid }); // Update entry with remaining valid stamps
    } // End if-else
  } // End loop
} // End pruneStaleRecords

export interface RateLimitOptions { // Configuration options for rate limiting
  windowMs: number; // Time window duration in milliseconds
  maxRequests: number; // Maximum allowable requests within the window
} // End RateLimitOptions

export interface RateLimitResult { // Outcome of a rate limit check
  allowed: boolean; // Whether the incoming request is permitted
  remaining: number; // Remaining allowed requests in current window
  resetInSeconds: number; // Time until window resets in seconds
} // End RateLimitResult

export function checkRateLimit(key: string, options: RateLimitOptions): RateLimitResult { // Evaluates request limits for a key
  const now = Date.now(); // Current unix epoch timestamp
  pruneStaleRecords(options.windowMs); // Trigger lazy pruning of expired records
  const cutoff = now - options.windowMs; // Determine valid timestamp cutoff
  const record = storage.get(key) || { timestamps: [] }; // Fetch or initialize key entry
  const recent = record.timestamps.filter((ts) => ts > cutoff); // Filter timestamps inside current window
  if (recent.length >= options.maxRequests) { // Check if request threshold is reached
    const oldest = recent[0] || now; // Get earliest timestamp in window
    const resetMs = Math.max(0, options.windowMs - (now - oldest)); // Calculate remaining window time
    return { // Return limit exceeded result
      allowed: false, // Disallow request
      remaining: 0, // Zero slots left
      resetInSeconds: Math.ceil(resetMs / 1000), // Ceil reset time to seconds
    }; // End result
  } // End threshold check
  recent.push(now); // Append current timestamp to history
  storage.set(key, { timestamps: recent }); // Save updated record
  return { // Return allowed result
    allowed: true, // Allow request
    remaining: Math.max(0, options.maxRequests - recent.length), // Compute remaining slots
    resetInSeconds: Math.ceil(options.windowMs / 1000), // Estimated window span
  }; // End result
} // End checkRateLimit

export function getClientIp(req: NextRequest | Request): string { // Resolves client IP address from proxy forwarding headers
  const forwarded = req.headers.get("x-forwarded-for"); // Check x-forwarded-for header
  if (forwarded) { // If header present
    const firstIp = forwarded.split(",")[0]?.trim(); // Take first forwarded proxy address
    if (firstIp) return firstIp; // Return forwarded IP
  } // End forwarded check
  const realIp = req.headers.get("x-real-ip"); // Check x-real-ip header
  if (realIp && realIp.trim()) { // If header present
    return realIp.trim(); // Return real IP
  } // End realIp check
  return "127.0.0.1"; // Fallback to localhost address
} // End getClientIp
