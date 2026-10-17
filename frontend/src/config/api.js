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
