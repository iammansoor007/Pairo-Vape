/**
 * Enterprise Spam & Abuse Protection for U Vape Submissions
 */

const BLOCKED_KEYWORDS = [
  'crypto', 'bitcoin', 'investment', 'rich', 'casino', 'viagra', 'enlarge', 
  'cheap', 'luxury watch', 'seo service', 'google rank', 'free followers'
];

/**
 * Validates a submission for spam indicators
 * @param {Object} data - Submission data (body)
 * @param {string} ip - Client IP
 * @returns {Object} { isSpam: boolean, reason: string }
 */
export function checkSpam(data, ip) {
  const { name, email, subject, message, hp_field } = data;

  // 1. Honeypot check (hp_field should be empty)
  if (hp_field) {
    return { isSpam: true, reason: 'Honeypot triggered' };
  }

  // 2. Disposable email check (Simplified)
  const disposableDomains = ['tempmail.com', '10minutemail.com', 'throwawaymail.com'];
  const domain = email?.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { isSpam: true, reason: 'Disposable email' };
  }

  // 3. Keyword Analysis
  const content = `${subject} ${message}`.toLowerCase();
  const foundKeyword = BLOCKED_KEYWORDS.find(word => content.includes(word));
  if (foundKeyword) {
    return { isSpam: true, reason: `Spam keyword detected: ${foundKeyword}` };
  }

  // 4. Pattern check (e.g. all caps, excessive links)
  const linkCount = (message.match(/https?:\/\/[^\s]+/g) || []).length;
  if (linkCount > 3) {
    return { isSpam: true, reason: 'Excessive links' };
  }

  return { isSpam: false };
}
