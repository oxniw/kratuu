// ==============================================================================
// File: .//Description-of-file/mongo_sanitizer.md
// Overview: Defends against NoSQL operator injection by stripping or rejecting prohibited MongoDB query operators and keys.
// ==============================================================================

export function hasMongoOperators(input: unknown): boolean { // Checks if input contains MongoDB operator keys like $gt, $ne, or dots
  if (!input || typeof input !== "object") { // Guard for non-object primitives
    return false; // Primitives cannot hold operator keys
  } // End primitive guard
  if (Array.isArray(input)) { // Process array elements
    return input.some((item) => hasMongoOperators(item)); // Recursively inspect each array member
  } // End array branch
  for (const key of Object.keys(input as Record<string, unknown>)) { // Iterate object keys
    if (key.startsWith("$") || key.includes(".")) { // Reject dollar operators or dotted paths
      return true; // Malicious operator detected
    } // End key inspection
    const val = (input as Record<string, unknown>)[key]; // Retrieve property value
    if (typeof val === "object" && val !== null) { // Inspect nested objects
      if (hasMongoOperators(val)) { // Check nested child object
        return true; // Propagate operator detection
      } // End nested check
    } // End nested object condition
  } // End keys loop
  return false; // Clean payload without MongoDB operators
} // End hasMongoOperators

export function sanitizeMongoInput<T>(input: T): T { // Recursively sanitizes objects by eliminating dollar and dot keys
  if (!input || typeof input !== "object") { // Return primitives untouched
    return input; // Return original primitive
  } // End primitive branch
  if (Array.isArray(input)) { // Sanitize array members
    return input.map((item) => sanitizeMongoInput(item)) as unknown as T; // Map sanitized items
  } // End array branch
  const cleanObj: Record<string, unknown> = {}; // Initialize clean object container
  for (const [key, value] of Object.entries(input as Record<string, unknown>)) { // Walk object entries
    if (key.startsWith("$") || key.includes(".")) { // Filter out MongoDB operators and dotted path traversals
      continue; // Skip dangerous key
    } // End filter
    if (typeof value === "object" && value !== null) { // Check nested structure
      cleanObj[key] = sanitizeMongoInput(value); // Recursively sanitize child
    } else { // Primitive value
      cleanObj[key] = value; // Assign clean primitive
    } // End if-else
  } // End for loop
  return cleanObj as T; // Return sanitized object
} // End sanitizeMongoInput

export function safeRegexString(query: string): string { // Escapes special characters to prevent regular expression denial of service
  if (typeof query !== "string") { // Guard against non-string input
    return ""; // Return empty string
  } // End guard
  return query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // Escape regex metacharacters
} // End safeRegexString
