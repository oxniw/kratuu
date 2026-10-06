// ==============================================================================
// File: .//Description-of-file/next_config.md
// Overview: Next.js application configuration with production security headers.
// ==============================================================================

import type { NextConfig } from "next"; // Import Next.js configuration type

const nextConfig: NextConfig = { // Define Next.js configuration object
  poweredByHeader: false, // Hide X-Powered-By header to prevent technology fingerprinting
  async headers() { // Register HTTP security response headers
    return [ // Return headers mapping array
      { // Apply headers across all application routes
        source: "/:path*", // Wildcard path pattern
        headers: [ // Security header definitions
          { key: "X-Frame-Options", value: "DENY" }, // Prevent clickjacking by forbidding frame embedding
          { key: "X-Content-Type-Options", value: "nosniff" }, // Prevent MIME-type sniffing
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, // Restrict referrer leakage to third parties
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }, // Disable unused browser hardware APIs
          { key: "X-XSS-Protection", value: "1; mode=block" }, // Enable browser cross-site scripting filter
        ], // End headers array
      }, // End route configuration
    ]; // End return
  }, // End headers method
}; // End nextConfig

export default nextConfig; // Export Next.js configuration
