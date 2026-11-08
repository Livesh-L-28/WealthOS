/**
 * WealthOS Mobile Deep Link Security & Validation Engine
 *
 * Implements:
 * 1. Scheme and host allowlisting (wealthos:// and app.wealthos.com).
 * 2. Path routing allowlisting.
 * 3. Prevention of token/credential leakage in URL parameters.
 * 4. State/nonce verification for OAuth/OIDC callbacks.
 * 5. Open redirect defense against arbitrary external redirection.
 */

export interface ValidatedDeepLink {
  isValid: boolean;
  path: string;
  params: Record<string, string>;
  error?: string;
}

const ALLOWED_SCHEMES = ['wealthos:'];
const ALLOWED_HOSTS = ['app.wealthos.com', 'localhost', ''];
const ALLOWED_PATHS = [
  '/auth/callback',
  '/dashboard',
  '/verify-email',
  '/reset-password',
  '/notifications',
  '/accounts',
];

const SENSITIVE_QUERY_KEYS = [
  'token',
  'access_token',
  'refresh_token',
  'password',
  'secret',
  'auth_token',
];

export function validateDeepLink(rawUrl: string, expectedState?: string): ValidatedDeepLink {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, path: '', params: {}, error: 'Empty or invalid URL provided' };
  }

  try {
    let parsed: URL;
    let customScheme = false;

    if (rawUrl.startsWith('wealthos://')) {
      customScheme = true;
      const pathAndQuery = rawUrl.slice('wealthos://'.length).replace(/^\/+/, '');
      parsed = new URL(`https://app.wealthos.com/${pathAndQuery}`);
    } else {
      parsed = new URL(rawUrl);
    }

    if (!customScheme && parsed.protocol !== 'https:') {
      return { isValid: false, path: '', params: {}, error: `Untrusted protocol scheme: ${parsed.protocol}` };
    }

    if (!customScheme && !ALLOWED_HOSTS.includes(parsed.hostname)) {
      return { isValid: false, path: '', params: {}, error: `Untrusted host: ${parsed.hostname}` };
    }

    // Path verification
    const normalizedPath = parsed.pathname.endsWith('/') && parsed.pathname.length > 1
      ? parsed.pathname.slice(0, -1)
      : parsed.pathname;

    const isAllowedPath = ALLOWED_PATHS.some(
      (allowed) => normalizedPath === allowed || normalizedPath.startsWith(`${allowed}/`)
    );

    if (!isAllowedPath) {
      return { isValid: false, path: normalizedPath, params: {}, error: `Path not allowlisted: ${normalizedPath}` };
    }

    // Extract query parameters
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((val, key) => {
      params[key] = val;
    });

    // Enforce credential leakage prevention
    for (const key of Object.keys(params)) {
      if (SENSITIVE_QUERY_KEYS.includes(key.toLowerCase())) {
        return {
          isValid: false,
          path: normalizedPath,
          params: {},
          error: `Insecure URL parameter rejected: credentials in query string (${key})`,
        };
      }
    }

    // Enforce state verification for callback routes
    if (normalizedPath === '/auth/callback' && expectedState) {
      if (params['state'] !== expectedState) {
        return {
          isValid: false,
          path: normalizedPath,
          params: {},
          error: 'State mismatch: potential CSRF or replay attack in auth callback',
        };
      }
    }

    // Open redirect protection: if redirect query param exists, ensure it is a relative internal path
    if (params['redirect']) {
      const redirectTarget = params['redirect'];
      if (
        redirectTarget.startsWith('//') ||
        redirectTarget.startsWith('http://') ||
        redirectTarget.startsWith('https://') ||
        redirectTarget.includes('\\')
      ) {
        return {
          isValid: false,
          path: normalizedPath,
          params: {},
          error: `Open redirect detected in parameter: ${redirectTarget}`,
        };
      }
    }

    return {
      isValid: true,
      path: normalizedPath,
      params,
    };
  } catch (err: any) {
    return {
      isValid: false,
      path: '',
      params: {},
      error: `Validation exception: ${err.message || err}`,
    };
  }
}
