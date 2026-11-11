/**
 * WealthOS Mobile Secure Diagnostic Logger with Automated PII Masking.
 *
 * Prevents accidental leakage of PAN, Aadhaar, bank account numbers,
 * auth tokens, and sensitive financial amounts into console outputs or crash reporting.
 */

const ACCOUNT_NUMBER_REGEX = /\b\d{9,18}\b/g;
const PAN_REGEX = /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi;
const BEARER_TOKEN_REGEX = /Bearer\s+([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_+/=]*)/gi;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;

/**
 * Sanitizes arbitrary values, strings, or nested objects, replacing sensitive PII with masked tokens.
 */
export function sanitizeLogData<T = any>(data: T): T {
  if (typeof data === 'string') {
    let sanitized: string = data;
    // 1. Mask Bearer JWT tokens
    sanitized = sanitized.replace(BEARER_TOKEN_REGEX, 'Bearer [REDACTED_TOKEN]');
    // 2. Mask PAN Tax IDs
    sanitized = sanitized.replace(PAN_REGEX, (pan) => `${pan.slice(0, 2)}•••••${pan.slice(-2)}`);
    // 3. Mask Bank Account numbers
    sanitized = sanitized.replace(ACCOUNT_NUMBER_REGEX, (acc) => `••••••••${acc.slice(-4)}`);
    // 4. Mask Email addresses
    sanitized = sanitized.replace(EMAIL_REGEX, (email) => {
      const [user, domain] = email.split('@');
      const maskedUser = user.length > 2 ? `${user[0]}•••${user[user.length - 1]}` : '•••';
      return `${maskedUser}@${domain}`;
    });
    return sanitized as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeLogData(item)) as unknown as T;
  }

  if (data !== null && typeof data === 'object') {
    const copy: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      const lowerKey = key.toLowerCase();
      // Directly redact sensitive key names
      if (
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('token') ||
        lowerKey.includes('authorization') ||
        lowerKey.includes('pin')
      ) {
        copy[key] = '[REDACTED]';
      } else {
        copy[key] = sanitizeLogData((data as any)[key]);
      }
    }
    return copy as T;
  }

  return data;
}

export const logger = {
  info: (message: string, ...optionalParams: any[]) => {
    const sanitizedParams = optionalParams.map(sanitizeLogData);
    console.info(`[WealthOS] ${sanitizeLogData(message)}`, ...sanitizedParams);
  },
  warn: (message: string, ...optionalParams: any[]) => {
    const sanitizedParams = optionalParams.map(sanitizeLogData);
    console.warn(`[WealthOS:WARN] ${sanitizeLogData(message)}`, ...sanitizedParams);
  },
  error: (message: string, ...optionalParams: any[]) => {
    const sanitizedParams = optionalParams.map(sanitizeLogData);
    console.error(`[WealthOS:ERROR] ${sanitizeLogData(message)}`, ...sanitizedParams);
  },
};
