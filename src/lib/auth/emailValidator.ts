// ==============================================================================
// File: .//Description-of-file/email_validator.md
// Overview: Validates email syntax, disposable domains, and DNS MX records for real email verification.
// ==============================================================================

import dns from "dns/promises"; // Import Node.js asynchronous DNS lookup promises

export interface EmailVerificationResult { // Interface representing real email verification outcome
  isValid: boolean; // Flag indicating if email is valid and can receive mail
  isRealDomain: boolean; // Flag indicating if domain has active MX servers
  isDisposable: boolean; // Flag indicating if domain is a known temporary throwaway service
  message: string; // Descriptive English status message
} // End EmailVerificationResult

const DISPOSABLE_DOMAINS = new Set([ // Blacklist of disposable and temporary email domains
  "mailinator.com", // Mailinator service
  "tempmail.com", // TempMail service
  "10minutemail.com", // 10MinuteMail service
  "guerrillamail.com", // GuerrillaMail service
  "guerrillamail.net", // GuerrillaMail domain
  "guerrillamail.org", // GuerrillaMail domain
  "sharklasers.com", // GuerrillaMail alias
  "throwawaymail.com", // ThrowAwayMail service
  "yopmail.com", // YopMail service
  "yopmail.fr", // YopMail domain
  "trashmail.com", // TrashMail service
  "dispostable.com", // Dispostable service
  "getairmail.com", // AirMail service
  "fakeinbox.com", // FakeInbox service
  "fakemailgenerator.com", // FakeMailGenerator service
]); // End disposable domains set

const EMAIL_SYNTAX_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/; // RFC standard email regex pattern

export async function verifyRealEmail(emailRaw: string): Promise<EmailVerificationResult> { // Verifies if an email is real via DNS MX records
  const email = emailRaw?.trim().toLowerCase(); // Normalize input string

  if (!email) { // Check if email is empty
    return { // Return missing email response
      isValid: false, // Mark invalid
      isRealDomain: false, // No domain
      isDisposable: false, // Not disposable
      message: "Email address is required.", // English error message
    }; // End return
  } // End empty check

  if (!EMAIL_SYNTAX_REGEX.test(email)) { // Check email against syntax pattern
    return { // Return invalid syntax response
      isValid: false, // Mark invalid
      isRealDomain: false, // No domain
      isDisposable: false, // Not disposable
      message: "Invalid email address format.", // English error message
    }; // End return
  } // End syntax check

  const [localPart, domain] = email.split("@"); // Extract local mailbox part and domain portion

  if (DISPOSABLE_DOMAINS.has(domain)) { // Check against disposable blacklist
    return { // Return disposable rejection
      isValid: false, // Mark invalid
      isRealDomain: false, // Rejected
      isDisposable: true, // Mark disposable
      message: "Disposable or temporary email addresses are not permitted.", // English rejection message
    }; // End return
  } // End disposable check

  // Provider-specific mailbox validation rules
  if (domain === "gmail.com" || domain === "googlemail.com") { // Check Google Gmail rules
    if (/^\d+$/.test(localPart)) { // Gmail does not allow all-numeric usernames
      return { // Return numeric Gmail error
        isValid: false, // Mark invalid
        isRealDomain: true, // Domain is real but username cannot exist
        isDisposable: false, // Not disposable
        message: "Gmail does not allow usernames consisting of only numbers. This is not a real Gmail address.", // English rejection message
      }; // End return
    } // End all-numeric check

    if (localPart.length < 6 || localPart.length > 30) { // Gmail requires 6-30 characters
      return { // Return length error
        isValid: false, // Mark invalid
        isRealDomain: true, // Real domain
        isDisposable: false, // Not disposable
        message: "Gmail usernames must be between 6 and 30 characters long.", // English rejection message
      }; // End return
    } // End length check

    if (/\.{2,}/.test(localPart) || localPart.startsWith(".") || localPart.endsWith(".")) { // Cannot have consecutive or boundary dots
      return { // Return dot error
        isValid: false, // Mark invalid
        isRealDomain: true, // Real domain
        isDisposable: false, // Not disposable
        message: "Gmail usernames cannot contain consecutive periods or begin/end with a period.", // English error
      }; // End return
    } // End dot check
  } else if (domain === "yahoo.com" || domain === "ymail.com") { // Check Yahoo rules
    if (/^\d+$/.test(localPart) || !/^[a-zA-Z]/.test(localPart)) { // Yahoo must start with a letter and cannot be all digits
      return { // Return Yahoo error
        isValid: false, // Mark invalid
        isRealDomain: true, // Real domain
        isDisposable: false, // Not disposable
        message: "Yahoo usernames must begin with a letter and cannot consist of only numbers.", // English error
      }; // End return
    } // End Yahoo check
  } // End provider rules check

  try { // Begin DNS MX lookup try block
    const mxRecords = await dns.resolveMx(domain); // Query DNS MX records for domain
    if (!mxRecords || mxRecords.length === 0) { // Check if no MX servers exist
      return { // Return missing mail server error
        isValid: false, // Mark invalid
        isRealDomain: false, // Cannot receive email
        isDisposable: false, // Not disposable
        message: `The domain "${domain}" has no mail exchange (MX) servers and cannot receive email.`, // English error message
      }; // End return
    } // End empty check

    return { // Return valid verified email result
      isValid: true, // Mark valid
      isRealDomain: true, // Domain verified with active MX
      isDisposable: false, // Not disposable
      message: `Verified real email domain with active mail servers on "${domain}".`, // English success message
    }; // End return
  } catch (err: unknown) { // Catch DNS resolution errors
    const dnsErr = err as { code?: string }; // Cast error object to access code property
    if (dnsErr.code === "ENOTFOUND" || dnsErr.code === "ENODATA") { // Check for non-existent domain codes
      return { // Return domain does not exist result
        isValid: false, // Mark invalid
        isRealDomain: false, // Domain does not exist
        isDisposable: false, // Not disposable
        message: `The email domain "${domain}" does not exist.`, // English error message
      }; // End return
    } // End ENOTFOUND check

    // Fallback: check if domain has A record (some mail hosts accept mail on A records)
    try { // Begin fallback try block
      const aRecords = await dns.resolve4(domain); // Query IPv4 A record for domain
      if (aRecords && aRecords.length > 0) { // Check if domain resolves to active host
        return { // Return valid fallback result
          isValid: true, // Mark valid
          isRealDomain: true, // Active domain
          isDisposable: false, // Not disposable
          message: `Verified real email domain on "${domain}".`, // English success message
        }; // End return
      } // End A record check
    } catch { // Catch fallback errors
      // Fall through to general failure
    } // End fallback catch

    return { // Return generic DNS failure
      isValid: false, // Mark invalid
      isRealDomain: false, // Cannot receive email
      isDisposable: false, // Not disposable
      message: `The email domain "${domain}" cannot receive email.`, // English error message
    }; // End return
  } // End try-catch
} // End verifyRealEmail
