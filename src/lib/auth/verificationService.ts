// ==============================================================================
// File: .//Description-of-file/verification_service.md
// Overview: Generates, sends, and validates 6-digit email registration OTP codes using MongoDB.
// ==============================================================================

import crypto from "crypto"; // Import Node.js crypto module for secure random number generation
import nodemailer from "nodemailer"; // Import nodemailer for dispatching emails
import { getDb } from "@/lib/db"; // Import MongoDB database accessor

const CODE_EXPIRY_MS = 10 * 60 * 1000; // Verification code validity duration of 10 minutes
const MAX_ATTEMPTS = 5; // Maximum allowable verification attempt retries

export async function sendVerificationCode(emailRaw: string): Promise<{ // Generates and sends 6-digit OTP code to email
  success: boolean; // Operation success indicator
  message: string; // English status description
  debugCode?: string; // Optional code returned in local development environment
}> {
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""; // Normalize email address

  if (!email) { // Check if email is missing
    return { success: false, message: "Email address is required." }; // Return validation error
  } // End email check

  // Generate cryptographically secure 6-digit integer code (100000 - 999999)
  const code = crypto.randomInt(100000, 1000000).toString(); // Generate 6-digit string
  const now = Date.now(); // Current unix epoch timestamp
  const expiresAt = now + CODE_EXPIRY_MS; // Expiration timestamp 10 minutes in future

  const db = await getDb(); // Retrieve database instance

  // Upsert verification record into MongoDB email_verifications collection
  await db.collection("email_verifications").updateOne( // Execute MongoDB upsert
    { email: String(email) }, // Match by email
    {
      $set: {
        email: String(email),
        code: String(code),
        attempts: 0,
        expires_at: expiresAt,
        created_at: now,
      },
    },
    { upsert: true } // Create if doesn't exist
  ); // End updateOne

  // Configure Nodemailer transporter if environment variables exist
  const smtpHost = process.env.SMTP_HOST; // Read SMTP server hostname
  const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587; // Read SMTP port number
  const smtpUser = process.env.SMTP_USER; // Read SMTP username
  const smtpPass = process.env.SMTP_PASS; // Read SMTP password

  let emailDispatched = false; // Flag tracking if external email was dispatched

  if (smtpHost && smtpUser && smtpPass) { // Check if live SMTP credentials are provided
    try { // Begin email dispatch try block
      const transporter = nodemailer.createTransport({ // Create SMTP transporter instance
        host: smtpHost, // Hostname
        port: smtpPort, // Port
        secure: smtpPort === 465, // Use SSL for port 465
        auth: { // Authentication credentials
          user: smtpUser, // Username
          pass: smtpPass, // Password
        }, // End auth
      }); // End createTransport

      await transporter.sendMail({ // Dispatch email message
        from: `"kratuu.board" <${smtpUser}>`, // Sender address
        to: email, // Recipient email address
        subject: `[kratuu] รหัสยืนยันการสมัครสมาชิกของคุณ: ${code}`, // Email subject line
        text: `รหัสยืนยันการสมัครสมาชิกของคุณคือ: ${code}\n\nรหัสนี้จะหมดอายุภายใน 10 นาที\nหากคุณไม่ได้ร้องขอรหัสนี้ สามารถเพิกเฉยข้อความนี้ได้`, // Plain text body
        html: `
          <div style="font-family: monospace; max-width: 480px; margin: 0 auto; border: 1px solid #000; padding: 24px; color: #000;">
            <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #666; margin: 0 0 8px;">kratuu • minimalist webboard</p>
            <h2 style="font-size: 20px; font-weight: bold; margin: 0 0 16px;">รหัสยืนยันการสมัครสมาชิก</h2>
            <p style="font-size: 13px; line-height: 1.6; margin: 0 0 20px;">กรุณานำรหัส 6 หลักด้านล่างนี้ไปกรอกในหน้าต่างลงทะเบียนเพื่อเปิดใช้งานบัญชีของคุณ:</p>
            <div style="text-align: center; border: 2px dashed #000; padding: 16px; margin: 0 0 20px;">
              <span style="font-size: 32px; font-weight: 900; letter-spacing: 8px;">${code}</span>
            </div>
            <p style="font-size: 12px; color: #666; margin: 0;">รหัสนี้มีอายุการใช้งาน 10 นาที (Expires in 10 minutes)</p>
          </div>
        `, // HTML formatted template
      }); // End sendMail
      emailDispatched = true; // Mark as dispatched
    } catch (err) { // Catch dispatch errors
      console.error("[EmailService] Failed to send email via SMTP:", err); // Log failure to console
    } // End try-catch
  } // End SMTP credentials check

  // Prominently log verification code in server terminal console for development visibility
  console.log("================================================="); // Decorative separator
  console.log(`[kratuu AUTH OTP] Email: ${email}`); // Log target email
  console.log(`[kratuu AUTH OTP] Verification Code: >>> ${code} <<<`); // Log 6-digit code
  console.log(`[kratuu AUTH OTP] Expires: ${new Date(expiresAt).toLocaleTimeString()}`); // Log expiry time
  console.log("================================================="); // Decorative separator

  return { // Return response payload
    success: true, // Mark success
    message: emailDispatched // Context message
      ? `Verification code sent to ${email}.` // Sent via live SMTP
      : `Verification code generated for ${email}. (Check server console or test code)`, // Dev fallback message
    debugCode: process.env.NODE_ENV !== "production" ? code : undefined, // Provide code for test runner in dev
  }; // End return
} // End sendVerificationCode

export async function verifyEmailCode( // Validates user-submitted 6-digit code
  emailRaw: string, // Target email address
  codeRaw: string // 6-digit code entered by user
): Promise<{ success: boolean; error?: string }> { // Return validation outcome
  const email = typeof emailRaw === "string" ? emailRaw.trim().toLowerCase() : ""; // Normalize email
  const code = typeof codeRaw === "string" ? codeRaw.trim() : ""; // Normalize submitted code

  if (!email || !code) { // Check if either input is missing
    return { success: false, error: "Email and verification code are required." }; // Validation error
  } // End check

  const db = await getDb(); // Obtain database instance

  const row = await db.collection("email_verifications").findOne({ email: String(email) }); // Query active verification document

  if (!row) { // Check if record was not found
    return { success: false, error: "No verification code requested for this email. Please request a new code." }; // Error response
  } // End empty check

  const storedCode = String(row.code); // Read stored code
  const attempts = Number(row.attempts || 0); // Read current attempts count
  const expiresAt = Number(row.expires_at || 0); // Read expiration timestamp
  const now = Date.now(); // Current timestamp

  if (now > expiresAt) { // Check if code has expired
    await db.collection("email_verifications").deleteOne({ email: String(email) }); // Purge expired record
    return { success: false, error: "Verification code has expired. Please request a new code." }; // Expired error
  } // End expired check

  if (attempts >= MAX_ATTEMPTS) { // Check if attempt limit exceeded
    await db.collection("email_verifications").deleteOne({ email: String(email) }); // Invalidate compromised code
    return { success: false, error: "Too many incorrect attempts. Please request a new verification code." }; // Rate limit error
  } // End attempts check

  if (code !== storedCode) { // Verify if submitted code matches stored code
    await db.collection("email_verifications").updateOne( // Increment failed attempt counter
      { email: String(email) },
      { $inc: { attempts: 1 } }
    );
    const remaining = MAX_ATTEMPTS - (attempts + 1); // Calculate remaining attempts
    return { // Return mismatch error
      success: false, // Mark failed
      error: `Invalid verification code. (${remaining} attempts remaining)`, // Localized error message
    }; // End return
  } // End mismatch check

  // Successfully verified: remove OTP record to prevent replay attacks
  await db.collection("email_verifications").deleteOne({ email: String(email) }); // Delete record

  return { success: true }; // Return successful verification
} // End verifyEmailCode
