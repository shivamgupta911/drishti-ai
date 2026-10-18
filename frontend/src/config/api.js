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
