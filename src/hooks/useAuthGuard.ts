// ==============================================================================
// File: .//Description-of-file/use_auth_guard.md
// Overview: Reusable authentication gate enforcing sign-in before user actions.
// ==============================================================================

"use client"; // Enable client component execution

import { useCallback } from "react"; // Import React useCallback hook
import { useAuth } from "./useAuth"; // Import shared authentication hook

export const OPEN_AUTH_MODAL_EVENT = "kratuu_open_auth_modal"; // Event key for displaying authentication modal

export function useAuthGuard() { // Define auth guard hook
  const { user, loading } = useAuth(); // Consume user profile and loading flag from auth context

  const requireAuth = useCallback( // Memoize requireAuth callback
    (action: () => void, actionName: string = "ดำเนินการ") => { // Function to guard action execution
      if (loading) { // If session check is currently in progress
        return false; // Suppress false alarm while validating session with server
      } // End loading check

      if (user) { // Check if user is authenticated
        action(); // Execute protected action
        return true; // Return successful execution
      } // End user check

      // Dispatch global event to pop up AuthModal with custom prompt
      if (typeof window !== "undefined") { // Verify browser window object
        window.dispatchEvent( // Dispatch CustomEvent
          new CustomEvent(OPEN_AUTH_MODAL_EVENT, { // Instantiate modal open event
            detail: { // Event detail payload
              promptMessage: `กรุณาเข้าสู่ระบบก่อน${actionName}`, // Custom notification message
            }, // End payload
          }) // End CustomEvent
        ); // End dispatchEvent
      } // End window check
      return false; // Return unauthenticated result
    }, // End callback
    [user, loading] // Depend on user and loading state
  ); // End useCallback

  return { // Return auth guard API
    user, // Currently authenticated user object
    loading, // Background loading status
    isAuthenticated: Boolean(user), // Boolean indicator of user authentication
    requireAuth, // Action guarding execution function
  }; // End return
} // End useAuthGuard
