// ==============================================================================
// File: .//Description-of-file/board_page.md
// Overview: Direct routing shortcut redirecting /board to the main Board feed.
// ==============================================================================

import { redirect } from "next/navigation"; // Import Next.js redirect helper

export default function BoardRedirectPage() { // Direct navigation handler for /board route
  redirect("/?category=Board"); // Perform server-side redirect to main Board category feed
} // End BoardRedirectPage
