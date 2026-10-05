// ==============================================================================
// File: .//Description-of-file/auth_context.md
// Overview: Unified global authentication context provider and state manager.
// ==============================================================================

"use client"; // Enable React client component execution

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react"; // Import React core hooks and types
import { SafeUser } from "@/lib/auth/types"; // Import safe user profile type definition

const AUTH_CHANGED_EVENT = "kratuu_auth_changed"; // Event key for cross-component auth synchronization
const CACHED_USER_KEY = "kratuu_auth_user"; // Local storage key for persistent user state cache

export interface AuthContextType { // Interface representing context value contract
  user: SafeUser | null; // Currently authenticated user object
  loading: boolean; // Flag indicating if session validation is underway
  login: (username: string, password: string) => Promise<SafeUser>; // Login action returning user
  register: (username: string, displayName: string, password: string, email?: string) => Promise<SafeUser>; // Registration action
  sendVerification: (email: string, username?: string) => Promise<{ success: boolean; message: string; debugCode?: string }>; // Send 6-digit code action
  verifyCodeAndRegister: (payload: { email: string; code: string; username: string; displayName: string; password: string }) => Promise<SafeUser>; // Verify OTP and register action
  logout: () => Promise<void>; // Logout action clearing credentials
  refreshUser: () => Promise<void>; // Action to re-validate session with server
} // End AuthContextType

const AuthContext = createContext<AuthContextType | undefined>(undefined); // Initialize React context instance

export function AuthProvider({ children }: { children: ReactNode }) { // Define context provider wrapper component
  // Initialize user synchronously from storage cache to eliminate unauthenticated hydration flash
  const [user, setUser] = useState<SafeUser | null>(() => { // Initialize user state with function
    if (typeof window !== "undefined") { // Verify browser execution environment
      try { // Begin storage retrieval try block
        const cached = localStorage.getItem(CACHED_USER_KEY); // Read cached user string from storage
        return cached ? (JSON.parse(cached) as SafeUser) : null; // Parse JSON user or return null
      } catch { // Catch any storage or parsing errors
        return null; // Return null on error
      } // End try-catch
    } // End window check
    return null; // Fallback for server-side render
  }); // End user state declaration

  const [loading, setLoading] = useState(true); // Track background server session verification status

  const refreshUser = useCallback(async () => { // Function to query server for current session user
    try { // Begin fetch try block
      const res = await fetch("/api/auth/me"); // Call server auth check endpoint
      if (res.ok) { // Check if endpoint returned success
        const data = await res.json(); // Parse response JSON
        if (data.user) { // Check if user object exists in response
          setUser(data.user); // Store resolved user in React state
          if (typeof window !== "undefined") { // Check window availability
            localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user)); // Cache user in local storage
          } // End window check
        } else { // Handle empty user in response
          setUser(null); // Clear user state
          if (typeof window !== "undefined") { // Check window availability
            localStorage.removeItem(CACHED_USER_KEY); // Evict stale user from cache
          } // End window check
        } // End data.user check
      } else { // Handle non-ok response status
        setUser(null); // Clear user state on failure
        if (typeof window !== "undefined") { // Check window availability
          localStorage.removeItem(CACHED_USER_KEY); // Evict stale user from cache
        } // End window check
      } // End res.ok check
    } catch { // Catch network or fetch errors
      // On network failure retain cached user if present to prevent accidental session drops
    } finally { // Run finally on completion
      setLoading(false); // Mark verification as resolved
    } // End finally block
  }, []); // Refresh callback dependencies

  useEffect(() => { // Mount effect to trigger server check and event listeners
    refreshUser(); // Validate session with backend API

    const handleAuthChange = () => { // Handler for global auth change event
      refreshUser(); // Re-sync user state on event trigger
    }; // End handleAuthChange

    window.addEventListener(AUTH_CHANGED_EVENT, handleAuthChange); // Attach auth change listener
    return () => { // Cleanup function on unmount
      window.removeEventListener(AUTH_CHANGED_EVENT, handleAuthChange); // Detach auth change listener
    }; // End cleanup
  }, [refreshUser]); // Re-run effect if refreshUser changes

  const login = async (username: string, password: string) => { // User login action
    const res = await fetch("/api/auth/login", { // Send login POST request
      method: "POST", // HTTP POST method
      headers: { "Content-Type": "application/json" }, // Set JSON content headers
      body: JSON.stringify({ username, password }), // Stringify login payload
    }); // End fetch call

    const data = await res.json(); // Parse JSON response payload
    if (!res.ok) { // Check if login attempt failed
      throw new Error(data.error || "เข้าสู่ระบบไม่สำเร็จ"); // Throw localized error message
    } // End failure check

    setUser(data.user); // Update user in state
    if (typeof window !== "undefined") { // Check window availability
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user)); // Cache user in storage
    } // End window check
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT)); // Dispatch global auth update event
    return data.user; // Return logged in user
  }; // End login

  const register = async (username: string, displayName: string, password: string, email?: string) => { // User registration action
    const res = await fetch("/api/auth/register", { // Send registration POST request
      method: "POST", // HTTP POST method
      headers: { "Content-Type": "application/json" }, // Set JSON content headers
      body: JSON.stringify({ username, display_name: displayName, password, email }), // Stringify registration payload
    }); // End fetch call

    const data = await res.json(); // Parse JSON response payload
    if (!res.ok) { // Check if registration failed
      throw new Error(data.error || "สมัครสมาชิกไม่สำเร็จ"); // Throw localized error message
    } // End failure check

    setUser(data.user); // Update user in state
    if (typeof window !== "undefined") { // Check window availability
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user)); // Cache user in storage
    } // End window check
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT)); // Dispatch global auth update event
    return data.user; // Return registered user
  }; // End register

  const sendVerification = async (email: string, username?: string) => { // Send 6-digit OTP verification code action
    const res = await fetch("/api/auth/send-verification", { // Send POST request
      method: "POST", // HTTP POST method
      headers: { "Content-Type": "application/json" }, // Set JSON headers
      body: JSON.stringify({ email, username }), // Pass payload
    }); // End fetch
    const data = await res.json(); // Parse response JSON
    if (!res.ok) { // Check if request failed
      throw new Error(data.error || "Failed to send verification code."); // Throw error message
    } // End check
    return data; // Return outcome
  }; // End sendVerification

  const verifyCodeAndRegister = async (payload: { // Verifies code and completes account registration
    email: string; // Target email
    code: string; // 6-digit code
    username: string; // Desired username
    displayName: string; // Desired display name
    password: string; // Desired password
  }) => {
    const res = await fetch("/api/auth/verify-code", { // Send POST request to verify code
      method: "POST", // HTTP POST method
      headers: { "Content-Type": "application/json" }, // Set JSON headers
      body: JSON.stringify(payload), // Pass payload
    }); // End fetch
    const data = await res.json(); // Parse response JSON
    if (!res.ok) { // Check if verification failed
      throw new Error(data.error || "Failed to verify code."); // Throw error message
    } // End check
    setUser(data.user); // Store registered user
    if (typeof window !== "undefined") { // Check window availability
      localStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.user)); // Cache user
    } // End window check
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT)); // Dispatch auth event
    return data.user; // Return created user
  }; // End verifyCodeAndRegister

  const logout = async () => { // User logout action
    try { // Begin logout try block
      await fetch("/api/auth/logout", { method: "POST" }); // Send logout request to revoke cookie
    } catch { // Ignore network errors during logout
    } finally { // Always execute state teardown
      setUser(null); // Clear user state
      if (typeof window !== "undefined") { // Check window availability
        localStorage.removeItem(CACHED_USER_KEY); // Evict user from storage cache
      } // End window check
      window.dispatchEvent(new Event(AUTH_CHANGED_EVENT)); // Notify application of auth change
    } // End finally block
  }; // End logout

  return ( // Render provider markup with context value
    <AuthContext.Provider // Context provider element
      value={{ // Value bundle passed down the component tree
        user, // Active user object or null
        loading, // Session loading indicator
        login, // Login callback function
        register, // Register callback function
        sendVerification, // Send OTP callback function
        verifyCodeAndRegister, // Verify OTP and register callback function
        logout, // Logout callback function
        refreshUser, // Refresh session callback function
      }} // End value bundle
    >
      {children}
    </AuthContext.Provider>
  ); // End render
} // End AuthProvider

export function useAuth(): AuthContextType { // Hook to access shared authentication context
  const context = useContext(AuthContext); // Access context value
  if (!context) { // Ensure hook is consumed within provider
    throw new Error("useAuth must be used within an AuthProvider"); // Throw descriptive setup error
  } // End check
  return context; // Return active auth context
} // End useAuth
