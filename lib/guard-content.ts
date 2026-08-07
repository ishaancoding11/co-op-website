/**
 * Redacts contact details from free-text messages.
 *
 * Co-op makes money on subscriptions, not per-deal commission, but the whole
 * value of the platform still depends on conversations *staying* on it — reviews,
 * dispute history, and the paywall all break if two parties swap a phone number
 * in the first message and finish the job over WhatsApp. So message bodies are
 * run through this before they're stored: contact tokens are masked, not blocked,
 * so the rest of the message still goes through and the sender isn't left
 * guessing which word tripped a filter.
 *
 * This is deliberately conservative about what counts as "contact info" — it aims
 * to catch the obvious ways people share a way to reach them off-platform
 * (emails, phone numbers, @handles, links), while leaving ordinary prose alone.
 * It is a friction layer, not a security boundary: someone determined can always
 * spell a number out in words. That's fine — the goal is to stop the casual
 * "here's my number, text me" that would otherwise happen by default.
 */

const MASK = '[hidden]';

// Ordered most-specific first. Emails before URLs (an email contains no scheme
// but would otherwise be partly eaten by the handle rule), URLs before bare
// phone numbers, so each match consumes its whole token cleanly.
const PATTERNS: RegExp[] = [
  // Email — standard local@domain.tld, tolerant of + tags and dots.
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
  // URLs with a scheme, and bare domains for the common social hosts people
  // paste (instagram.com/…, t.me/…, wa.me/…) so a link isn't a loophole.
  /\b(?:https?:\/\/|www\.)[^\s]+/gi,
  /\b(?:t\.me|wa\.me|instagram\.com|facebook\.com|fb\.com|vk\.com|telegram\.me)\/[^\s]+/gi,
  // @handles (Instagram / Telegram style). Requires 3+ chars so it doesn't eat
  // a stray "@" or an email remnant (emails are already masked above).
  /(?:^|\s)@[A-Za-z0-9._]{3,}/g,
  // Phone numbers: an optional +, then 7+ digits allowing spaces, dashes,
  // dots and parens between them. Covers US (+1 949…) and KZ (+7 7__…) shapes
  // without hard-coding either. The 7-digit floor keeps prices and years
  // ("$500", "2026") from being mistaken for a number.
  /(?<![A-Za-z0-9])\+?\d[\d\s().-]{6,}\d(?![A-Za-z0-9])/g,
];

/** Replace any contact-looking tokens with [hidden]. Pure and side-effect free. */
export function redactContacts(text: string): string {
  let out = text;
  for (const re of PATTERNS) {
    out = out.replace(re, m => {
      // Preserve a leading space the handle/phone rules may have captured, so
      // "call me @john_doe" stays "call me [hidden]" and not "call me[hidden]".
      const lead = /^\s/.test(m) ? m[0] : '';
      return lead + MASK;
    });
  }
  return out;
}

/** Whether redaction would change the text — used to tell the sender we masked something. */
export function containsContactInfo(text: string): boolean {
  return redactContacts(text) !== text;
}
