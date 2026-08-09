/**
 * Helper utilitário centralizado para montar URLs da API REST no frontend.
 * Utiliza VITE_API_URL ou VITE_BACKEND_URL quando definidos no ambiente do Render/Vercel.
 */
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  'https://synapse-api.onrender.com'
).replace(/\/$/, '');

export function getApiUrl(endpoint: string): string {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  if (!API_BASE_URL) return cleanPath;
  return `${API_BASE_URL}${cleanPath}`;
}
