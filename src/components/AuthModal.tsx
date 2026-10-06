// ==============================================================================
// File: .//Description-of-file/auth_modal.md
// Overview: Swiss monochrome modal dialog for user login, registration, and 6-digit email OTP verification.
// ==============================================================================

"use client"; // Enable client-side execution for interactive modal

import React, { useState, useEffect } from "react"; // Import React core hooks
import { useAuth } from "@/hooks/useAuth"; // Import shared authentication context hook
import { OPEN_AUTH_MODAL_EVENT } from "@/hooks/useAuthGuard"; // Import global auth modal event identifier
import { X, LogIn, UserPlus, AlertCircle, KeyRound, ArrowLeft, RefreshCw } from "lucide-react"; // Import UI icons

interface AuthModalProps { // Component props interface definition
  isOpen: boolean; // Externally controlled visibility boolean
  onClose: () => void; // Close callback handler
  initialMode?: "login" | "register"; // Initial active authentication tab
  promptMessage?: string; // Optional custom action prompt banner
} // End AuthModalProps

export default function AuthModal({ // Main AuthModal component export
  isOpen: controlledIsOpen, // Destructure controlled isOpen prop
  onClose, // Destructure onClose prop
  initialMode = "login", // Default initial mode to login
  promptMessage: initialPrompt = "", // Default initial prompt to empty string
}: AuthModalProps) {
  const { login, sendVerification, verifyCodeAndRegister } = useAuth(); // Consume auth actions
  const [internalOpen, setInternalOpen] = useState(false); // Internal open toggle state
  const [mode, setMode] = useState<"login" | "register">(initialMode); // Active tab mode state
  const [prompt, setPrompt] = useState(initialPrompt); // Active prompt banner message state

  // Step state: "form" for credentials input, "enter_code" for 6-digit OTP verification
  const [step, setStep] = useState<"form" | "enter_code">("form"); // Active modal step
  const [verificationCode, setVerificationCode] = useState(""); // 6-digit verification code input state
  const [infoMsg, setInfoMsg] = useState(""); // Informational message state
  const [debugCode, setDebugCode] = useState(""); // Development test code display state
  const [resending, setResending] = useState(false); // Resend code loading indicator
  const [resendCooldown, setResendCooldown] = useState(0); // Resend timer cooldown in seconds

  // Form input states
  const [username, setUsername] = useState(""); // Username input state
  const [displayName, setDisplayName] = useState(""); // Display name input state
  const [email, setEmail] = useState(""); // Email input state
  const [password, setPassword] = useState(""); // Password input state
  const [emailStatus, setEmailStatus] = useState<{ // Real email and DB existence validation state
    checking: boolean; // Is verification check in progress
    isReal: boolean | null; // Has active DNS mail exchange servers
    exists: boolean | null; // Already present in database
    message: string; // English status description
  }>({ checking: false, isReal: null, exists: null, message: "" }); // Initial validation state
  const [submitting, setSubmitting] = useState(false); // Form submission loading state
  const [errorMsg, setErrorMsg] = useState(""); // Error message state

  const isOpen = controlledIsOpen || internalOpen; // Compute active visibility flag

  // Listen to global open auth modal events triggered by auth guards
  useEffect(() => { // Mount listener for global modal triggers
    const handleGlobalOpen = (e: Event) => { // Event handler function
      const customEvent = e as CustomEvent<{ promptMessage?: string }>; // Cast custom event
      if (customEvent.detail?.promptMessage) { // Check if custom prompt message was passed
        setPrompt(customEvent.detail.promptMessage); // Set custom action prompt
      } // End prompt check
      setMode("login"); // Default to login mode
      setStep("form"); // Reset to form step
      setInternalOpen(true); // Open modal
    }; // End handleGlobalOpen

    window.addEventListener(OPEN_AUTH_MODAL_EVENT, handleGlobalOpen); // Attach listener
    return () => { // Cleanup on unmount
      window.removeEventListener(OPEN_AUTH_MODAL_EVENT, handleGlobalOpen); // Detach listener
    }; // End cleanup
  }, []); // Empty dependency array for single listener mount

  // Resend cooldown timer decrement
  useEffect(() => { // Timer effect for 60s resend cooldown
    if (resendCooldown > 0) { // Check if cooldown is active
      const timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000); // Decrement by 1 each second
      return () => clearTimeout(timer); // Clean up active timer
    } // End cooldown check
  }, [resendCooldown]); // Re-run when cooldown value updates

  // Debounced check if email is a real email and if it exists in database
  useEffect(() => { // Debounce effect to verify email validity
    if (mode !== "register" || !email.trim()) { // Only execute in register mode with non-empty email
      setEmailStatus({ checking: false, isReal: null, exists: null, message: "" }); // Reset status
      return; // Early return
    } // End check

    const emailTrimmed = email.trim(); // Trim whitespace from email
    const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Email format regex
    if (!EMAIL_REGEX.test(emailTrimmed)) { // Check if basic syntax passes
      setEmailStatus({ checking: false, isReal: null, exists: null, message: "" }); // Clear status
      return; // Early return
    } // End syntax check

    const timer = setTimeout(async () => { // Debounce API check by 400ms
      try { // Begin check try block
        setEmailStatus((prev) => ({ ...prev, checking: true })); // Set checking flag to true
        const res = await fetch(`/api/auth/check-email?email=${encodeURIComponent(emailTrimmed)}`); // Query verification endpoint
        if (res.ok) { // Check if response is successful
          const data = await res.json(); // Parse response JSON
          setEmailStatus({ // Update validation state
            checking: false, // End checking flag
            isReal: Boolean(data.isReal), // Real email boolean flag
            exists: Boolean(data.exists), // Database existence boolean flag
            message: data.message || "", // English description
          }); // End setEmailStatus
        } else { // Handle non-ok response
          setEmailStatus({ checking: false, isReal: null, exists: null, message: "" }); // Reset status
        } // End res.ok check
      } catch { // Catch network errors
        setEmailStatus({ checking: false, isReal: null, exists: null, message: "" }); // Reset on error
      } // End try-catch
    }, 400); // 400ms delay

    return () => clearTimeout(timer); // Clear timer on deps change
  }, [email, mode]); // Re-run on email or mode changes

  if (!isOpen) return null; // Render nothing when modal is closed

  const resetForm = () => { // Reset all internal modal states
    setUsername(""); // Clear username
    setDisplayName(""); // Clear display name
    setEmail(""); // Clear email
    setPassword(""); // Clear password
    setVerificationCode(""); // Clear verification code
    setStep("form"); // Reset step to form
    setInfoMsg(""); // Clear info message
    setDebugCode(""); // Clear debug code
    setResendCooldown(0); // Reset cooldown
    setEmailStatus({ checking: false, isReal: null, exists: null, message: "" }); // Clear email status
    setErrorMsg(""); // Clear error message
    setPrompt(""); // Clear prompt banner
  }; // End resetForm

  const handleClose = () => { // Handler for closing modal
    resetForm(); // Reset form values
    setInternalOpen(false); // Close internal state
    onClose(); // Call external close callback
  }; // End handleClose

  const handleSubmit = async (e: React.FormEvent) => { // Handle login or registration submission
    e.preventDefault(); // Prevent standard browser form submission
    setErrorMsg(""); // Clear previous errors

    if (mode === "login") { // Process login flow
      setSubmitting(true); // Turn on loading spinner
      try { // Begin login try block
        await login(username, password); // Execute login action
        handleClose(); // Close modal on success
      } catch (err: unknown) { // Catch login exceptions
        if (err instanceof Error) { // Type check error
          setErrorMsg(err.message); // Set localized error
        } else { // Fallback error
          setErrorMsg("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"); // Generic error
        } // End error check
      } finally { // Finalize login submission
        setSubmitting(false); // Turn off loading spinner
      } // End finally
      return; // Exit handler
    } // End login mode

    // Mode is "register": validate inputs before sending verification code
    if (emailStatus.isReal === false) { // Block if email is not a real domain
      setErrorMsg(emailStatus.message || "Please provide a valid, real email address."); // Set error
      return; // Exit
    } // End real check

    if (emailStatus.exists === true) { // Block if email is already in database
      setErrorMsg("This email is already registered in the database. Please use another email."); // Set error
      return; // Exit
    } // End exists check

    setSubmitting(true); // Turn on loading indicator

    try { // Begin verification dispatch try block
      const res = await sendVerification(email, username); // Request 6-digit OTP code dispatch
      setStep("enter_code"); // Transition modal view to enter code step
      setInfoMsg(`รหัสยืนยัน 6 หลักถูกส่งไปยังอีเมลล์ ${email} แล้ว`); // Set success notification
      if (res.debugCode) { // Check if debug code returned in dev environment
        setDebugCode(res.debugCode); // Store debug code for testing convenience
      } // End debugCode check
      setResendCooldown(60); // Start 60-second resend cooldown timer
    } catch (err: unknown) { // Catch verification dispatch errors
      if (err instanceof Error) { // Check error type
        setErrorMsg(err.message); // Set error message
      } else { // Fallback error
        setErrorMsg("ไม่สามารถส่งรหัสยืนยันได้ กรุณาลองใหม่อีกครั้ง"); // Generic error
      } // End check
    } finally { // Finalize request
      setSubmitting(false); // Turn off loading indicator
    } // End finally
  }; // End handleSubmit

  const handleVerifyCodeSubmit = async (e: React.FormEvent) => { // Handle verification code confirmation
    e.preventDefault(); // Prevent standard submit
    setErrorMsg(""); // Clear error

    const cleanCode = verificationCode.trim(); // Clean code input
    if (cleanCode.length !== 6) { // Verify 6-digit length
      setErrorMsg("กรุณากรอกรหัสยืนยัน 6 หลักให้ครบถ้วน"); // Length error
      return; // Exit
    } // End length check

    setSubmitting(true); // Turn on loading indicator

    try { // Begin code verification try block
      await verifyCodeAndRegister({ // Submit verification payload to server
        email, // Target email
        code: cleanCode, // 6-digit OTP code
        username, // Username
        displayName: displayName || username, // Display name or fallback
        password, // Password
      }); // End verifyCodeAndRegister call
      handleClose(); // Close modal on successful account creation and sign in
    } catch (err: unknown) { // Catch verification or registration errors
      if (err instanceof Error) { // Check error type
        setErrorMsg(err.message); // Display error message
      } else { // Fallback error
        setErrorMsg("รหัสยืนยันไม่ถูกต้องหรือหมดอายุ"); // Generic verification error
      } // End check
    } finally { // Finalize submission
      setSubmitting(false); // Turn off loading indicator
    } // End finally
  }; // End handleVerifyCodeSubmit

  const handleResendCode = async () => { // Handle resending verification code
    if (resendCooldown > 0 || resending) return; // Prevent action during cooldown or active request
    setErrorMsg(""); // Clear errors
    setResending(true); // Turn on resending indicator

    try { // Begin resend try block
      const res = await sendVerification(email, username); // Request code re-dispatch
      setInfoMsg(`ส่งรหัสยืนยันชุดใหม่ไปยัง ${email} แล้ว`); // Set success feedback
      if (res.debugCode) { // Check if debug code present
        setDebugCode(res.debugCode); // Update test code
      } // End check
      setResendCooldown(60); // Reset 60s cooldown timer
    } catch (err: unknown) { // Catch resend errors
      if (err instanceof Error) { // Check error type
        setErrorMsg(err.message); // Set error message
      } else { // Fallback error
        setErrorMsg("ไม่สามารถส่งรหัสใหม่ได้ กรุณาลองอีกครั้ง"); // Generic error
      } // End check
    } finally { // Finalize resend
      setResending(false); // Turn off resending indicator
    } // End finally
  }; // End handleResendCode

  return ( // Render modal markup
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
      <div className="w-full max-w-md border border-black dark:border-white bg-white dark:bg-black p-6 font-mono text-black dark:text-white shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1 border border-black dark:border-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
          title="ปิด"
        >
          <X className="w-4 h-4" />
        </button>

        {/* STEP 2: ENTER 6-DIGIT CODE */}
        {step === "enter_code" ? (
          <div>
            <div className="mb-4">
              <span className="text-xs uppercase tracking-widest text-neutral-500">
                ยืนยันตัวตนผ่านอีเมลล์ (Email OTP)
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                กรอกรหัสยืนยัน (Enter Code)
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                ระบบได้ส่งรหัส 6 หลักไปยัง <span className="font-bold underline">{email}</span> แล้ว
              </p>
            </div>

            {infoMsg && (
              <div className="mb-4 p-2.5 border border-black dark:border-white bg-neutral-100 dark:bg-neutral-900 text-xs">
                {infoMsg}
              </div>
            )}

            {debugCode && (
              <div className="mb-4 p-2.5 border border-dashed border-black dark:border-white bg-neutral-50 dark:bg-neutral-950 text-xs font-mono">
                <span className="font-bold text-neutral-500 block text-[10px] uppercase">โหมดทดสอบ (Dev Test Code):</span>
                <span className="text-base font-black tracking-widest text-black dark:text-white">{debugCode}</span>
              </div>
            )}

            {errorMsg && (
              <div className="mb-4 p-2.5 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-xs">
                [ข้อผิดพลาด] {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyCodeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold mb-1">
                  รหัสยืนยัน 6 หลัก (Verification Code) <span className="text-neutral-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  autoFocus
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="••••••"
                  className="w-full px-3 py-3 border border-black dark:border-white bg-transparent text-center font-mono text-2xl font-bold tracking-[0.5em] focus:outline-none placeholder:tracking-widest"
                />
                <p className="text-[11px] font-mono text-neutral-500 mt-1 text-center">
                  รหัสมีอายุการใช้งาน 10 นาที (Expires in 10 minutes)
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting || verificationCode.length !== 6}
                className="w-full py-2.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-bold text-xs uppercase hover:opacity-85 disabled:opacity-50 transition-opacity cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{submitting ? "กำลังตรวจสอบรหัส..." : "ยืนยันรหัสและสร้างบัญชี"}</span>
              </button>

              <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between text-xs font-mono">
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setErrorMsg("");
                  }}
                  className="inline-flex items-center gap-1 text-neutral-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>ย้อนกลับไปแก้ไขข้อมูล</span>
                </button>

                <button
                  type="button"
                  disabled={resendCooldown > 0 || resending}
                  onClick={handleResendCode}
                  className="inline-flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:underline disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${resending ? "animate-spin" : ""}`} />
                  <span>
                    {resendCooldown > 0
                      ? `ส่งรหัสใหม่ได้ใน ${resendCooldown}s`
                      : "ส่งรหัสใหม่อีกครั้ง"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* STEP 1: LOGIN / REGISTER CREDENTIALS FORM */
          <div>
            {/* Modal Title */}
            <div className="mb-4">
              <span className="text-xs uppercase tracking-widest text-neutral-500">
                บัญชีผู้ใช้
              </span>
              <h2 className="text-xl font-bold tracking-tight">
                {mode === "login" ? "เข้าสู่ระบบ (Sign In)" : "สมัครสมาชิก (Sign Up)"}
              </h2>
            </div>

            {/* Action Gate Prompt Banner */}
            {prompt && (
              <div className="mb-4 p-2.5 border-2 border-black dark:border-white bg-black text-white dark:bg-white dark:text-black flex items-center gap-2 text-xs font-bold animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{prompt}</span>
              </div>
            )}

            {/* Mode Switcher Tabs */}
            <div className="flex border border-black dark:border-white mb-6 text-xs">
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setStep("form");
                  setErrorMsg("");
                }}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 border-r border-black dark:border-white ${
                  mode === "login"
                    ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>เข้าสู่ระบบ</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setStep("form");
                  setErrorMsg("");
                }}
                className={`flex-1 py-2 flex items-center justify-center gap-1.5 ${
                  mode === "register"
                    ? "bg-black text-white dark:bg-white dark:text-black font-bold"
                    : "hover:bg-neutral-100 dark:hover:bg-neutral-900"
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>สมัครสมาชิก</span>
              </button>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-4 p-2.5 border border-black dark:border-white bg-black text-white dark:bg-white dark:text-black text-xs">
                [ข้อผิดพลาด] {errorMsg}
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs uppercase font-bold mb-1">
                  {mode === "login" ? "ชื่อผู้ใช้ หรือ อีเมลล์ (Username or Email)" : "ชื่อผู้ใช้ (Username)"} <span className="text-neutral-500 font-normal">*</span>
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={mode === "login" ? "เช่น somchai_123 หรือ user@example.com" : "เช่น somchai_123"}
                  className="w-full px-3 py-2 border border-black dark:border-white bg-transparent text-sm focus:outline-none"
                />
              </div>

              {mode === "register" && (
                <div>
                  <label className="block text-xs uppercase font-bold mb-1">
                    ชื่อที่ต้องการให้แสดง (Display Name)
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="เช่น สมชาย ใจดี"
                    className="w-full px-3 py-2 border border-black dark:border-white bg-transparent text-sm focus:outline-none"
                  />
                </div>
              )}

              {mode === "register" && (
                <div>
                  <label className="block text-xs uppercase font-bold mb-1">
                    อีเมลล์ (Email) <span className="text-neutral-500 font-normal">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="เช่น somchai@example.com"
                    className={`w-full px-3 py-2 border bg-transparent text-sm focus:outline-none transition-colors ${
                      emailStatus.isReal === false || emailStatus.exists === true
                        ? "border-red-600 dark:border-red-500"
                        : emailStatus.isReal === true && emailStatus.exists === false
                        ? "border-green-600 dark:border-green-500"
                        : "border-black dark:border-white"
                    }`}
                  />
                  {emailStatus.checking && (
                    <p className="text-[11px] font-mono text-neutral-500 mt-1">
                      Checking if email is real and available...
                    </p>
                  )}
                  {!emailStatus.checking && emailStatus.isReal === false && (
                    <p className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold mt-1">
                      [!] {emailStatus.message}
                    </p>
                  )}
                  {!emailStatus.checking && emailStatus.isReal === true && emailStatus.exists === true && (
                    <p className="text-[11px] font-mono text-red-600 dark:text-red-400 font-bold mt-1">
                      [!] {emailStatus.message}
                    </p>
                  )}
                  {!emailStatus.checking && emailStatus.isReal === true && emailStatus.exists === false && (
                    <p className="text-[11px] font-mono text-neutral-600 dark:text-neutral-400 mt-1">
                      [✓] {emailStatus.message}
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs uppercase font-bold mb-1">
                  รหัสผ่าน (Password) <span className="text-neutral-500 font-normal">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (อย่างน้อย 6 ตัวอักษร)"
                  className="w-full px-3 py-2 border border-black dark:border-white bg-transparent text-sm focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 py-2.5 bg-black text-white dark:bg-white dark:text-black border border-black dark:border-white font-bold text-xs uppercase hover:opacity-85 disabled:opacity-50 transition-opacity cursor-pointer"
              >
                {submitting
                  ? "กำลังประมวลผล..."
                  : mode === "login"
                  ? "เข้าสู่ระบบ"
                  : "ยืนยันการสมัครสมาชิก"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  ); // End render
} // End AuthModal
