/**
 * Drishti AI - Unified API URL resolver
 * Resolves API requests using VITE_API_BASE_URL when defined,
 * falls back to the production Render URL in production builds,
 * and falls back cleanly to relative paths in local development to utilize Vite proxy.
 */
const RAW_API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://drishti-ai-backend-emau.onrender.com' : '');

export function getApiUrl(path = '') {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (!RAW_API_BASE_URL) {
    return cleanPath;
  }
  const normalizedBase = RAW_API_BASE_URL.replace(/\/+$/, '');
  if (normalizedBase.endsWith('/api') && cleanPath.startsWith('/api')) {
    return `${normalizedBase}${cleanPath.substring(4)}`;
  }
  return `${normalizedBase}${cleanPath}`;
}

export const API_BASE_URL = RAW_API_BASE_URL;

/**
 * Safely parses API responses, handling empty bodies, HTML error pages, and JSON payloads.
 * Guarantees meaningful, human-readable diagnostics rather than SyntaxError: Unexpected token '<'
 */
export async function safeParseResponse(response) {
  if (!response) {
    throw new Error('No response received from backend service.');
  }

  const contentType = (response.headers && response.headers.get('content-type')) || '';
  const text = await response.text();
  const trimmed = text ? text.trim() : '';

  // 1. Completely empty response body
  if (!trimmed) {
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'Empty error response'})`);
    }
    return {};
  }

  // 2. JSON detection & safe parsing
  const looksLikeJson = trimmed.startsWith('{') || trimmed.startsWith('[');
  if (contentType.includes('application/json') || looksLikeJson) {
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      if (!response.ok) {
        throw new Error(`Server error HTTP ${response.status}: Failed to parse JSON error response`);
      }
      throw new Error(`Invalid JSON received from server: ${parseErr.message}`);
    }

    if (!response.ok) {
      const message =
        parsed?.error?.message ||
        parsed?.error ||
        parsed?.message ||
        `Server returned HTTP ${response.status} (${response.statusText || 'Error'})`;
      throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
    }

    return parsed;
  }

  // 3. Non-JSON response (e.g. HTML error page or plain text from proxy / gateway / cold start)
  if (!response.ok) {
    const isHtml = trimmed.startsWith('<') || contentType.includes('text/html');
    if (isHtml) {
      if (response.status === 502 || response.status === 503 || response.status === 504) {
        throw new Error(
          `Backend service temporarily unavailable (HTTP ${response.status}). If the service was idle, Render may take 30–45s to wake up.`
        );
      }
      if (response.status === 404) {
        throw new Error(`API endpoint not found (HTTP 404). Please verify the server route.`);
      }
      throw new Error(`Server returned HTTP ${response.status} (${response.statusText || 'HTML error page'})`);
    }
    throw new Error(`Server returned HTTP ${response.status}: ${trimmed.slice(0, 150)}`);
  }

  return { data: trimmed };
}

// -------------------------------------------------------------
// Authentication & Session Token Management
// -------------------------------------------------------------
let cachedToken = '';

/**
 * Returns active Bearer token, loading from sessionStorage if present
 */
export function getAuthToken() {
  if (cachedToken) return cachedToken;
  if (typeof window !== 'undefined' && window.sessionStorage) {
    cachedToken = window.sessionStorage.getItem('drishti_auth_token') || '';
  }
  return cachedToken;
}

/**
 * Stores active Bearer token in memory and sessionStorage
 */
export function setAuthToken(token) {
  cachedToken = token || '';
  if (typeof window !== 'undefined' && window.sessionStorage) {
    if (token) {
      window.sessionStorage.setItem('drishti_auth_token', token);
    } else {
      window.sessionStorage.removeItem('drishti_auth_token');
    }
  }
}

/**
 * Clears active Bearer token
 */
export function clearAuthToken() {
  setAuthToken('');
}

/**
 * Requests an authorized session token for the active demo persona from the backend
 */
export async function requestDemoSession(persona = 'recruiter') {
  try {
    if (persona === 'admin') {
      const url = getApiUrl('/api/auth/login');
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: 'admin@drishti.ai', password: 'Admin@123' }),
      });
      const data = await safeParseResponse(res);
      if (data.token) {
        setAuthToken(data.token);
      }
      return data;
    }

    const url = getApiUrl('/api/auth/demo-session');
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ persona }),
    });
    const data = await safeParseResponse(res);
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  } catch (err) {
    console.warn('Demo session acquisition failed:', err.message);
    return null;
  }
}

// -------------------------------------------------------------
// Transparent Fetch Interceptor for Authenticated API Requests
// Automatically injects Authorization header into all private API calls
// -------------------------------------------------------------
if (typeof window !== 'undefined' && window.fetch && !window.__drishti_fetch_intercepted__) {
  const originalFetch = window.fetch;
  window.fetch = function (input, init = {}) {
    const urlStr = typeof input === 'string' ? input : (input && input.url ? input.url : '');
    const isPublic =
      urlStr.includes('/api/health') ||
      urlStr.includes('/api/auth/login') ||
      urlStr.includes('/api/auth/demo-session') ||
      urlStr.includes('/api/auth/register');

    if (urlStr.includes('/api/') && !isPublic) {
      const token = getAuthToken();
      if (token) {
        let headers;
        if (init.headers instanceof Headers) {
          headers = new Headers(init.headers);
        } else if (Array.isArray(init.headers)) {
          headers = new Headers(init.headers);
        } else if (typeof init.headers === 'object' && init.headers !== null) {
          headers = new Headers(init.headers);
        } else {
          headers = new Headers();
        }

        if (!headers.has('Authorization')) {
          headers.set('Authorization', `Bearer ${token}`);
        }
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }
        init = { ...init, headers };
      }
    }
    return originalFetch.call(this, input, init);
  };
  window.__drishti_fetch_intercepted__ = true;
}
