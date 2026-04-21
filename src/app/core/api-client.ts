import { environment } from '../../environments/environment';

export const API_BASE = environment.apiBaseUrl;

export function apiUrl(path: string) {
  if (!path) return API_BASE;
  return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}
