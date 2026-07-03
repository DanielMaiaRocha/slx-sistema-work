import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Party = { name: string; cpf: string; rg: string; profession: string };

/**
 * The locador (`landlordData`) and locatário (`tenantData`) fields each used to
 * hold a single party object; both can now hold several. Normalize whatever is
 * stored — a raw JSON string, a parsed object (legacy single party), or an
 * array — into an array of party objects for the UI. Always returns at least
 * one entry so the form/detail view has a card to render (an empty card shows
 * the "Não informado" fallbacks).
 */
export function normalizeParties(raw: unknown): Party[] {
  let data: unknown = raw;
  if (typeof raw === 'string') {
    try { data = JSON.parse(raw || '{}'); } catch { data = {}; }
  }
  const arr = Array.isArray(data)
    ? data
    : (data && typeof data === 'object' ? [data] : []);
  const mapped = arr
    .filter((t: any) => t && typeof t === 'object')
    .map((t: any) => ({
      name: t.name || '',
      cpf: t.cpf || '',
      rg: t.rg || '',
      profession: t.profession || '',
    }));
  return mapped.length ? mapped : [{ name: '', cpf: '', rg: '', profession: '' }];
}

/**
 * Resolves a media URL to a full, fetchable URL.
 * Handles:
 * - New format: /api/media/:id → prepend API base URL
 * - Legacy localhost URLs → extract /uploads/... and prepend production base
 * - Legacy relative paths → /uploads/filename → prepend base URL
 * - Full https:// URLs → return as-is
 * - Blob URLs → return as-is
 */
export function getAssetUrl(photoPath: string | null | undefined): string {
  if (!photoPath) return "";
  if (photoPath.startsWith('blob:') || photoPath.startsWith('data:')) {
    return photoPath;
  }
  
  // Get API base URL (strip trailing /api)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://slx-sistema-work-production.up.railway.app/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');

  // New format: /api/media/:id
  if (photoPath.startsWith('/api/media/')) {
    return `${baseUrl}${photoPath}`;
  }

  // Handle legacy localhost URLs stored in the database
  if (photoPath.includes('localhost')) {
    // Try to extract /api/media/:id
    const mediaMatch = photoPath.match(/\/api\/media\/[a-zA-Z0-9_-]+/);
    if (mediaMatch) {
      return `${baseUrl}${mediaMatch[0]}`;
    }
    // Try to extract /uploads/filename
    const uploadsMatch = photoPath.match(/\/uploads\/.+$/);
    if (uploadsMatch) {
      return `${baseUrl}${uploadsMatch[0]}`;
    }
  }
  
  // Full HTTPS URL — return as-is
  if (photoPath.startsWith('https://')) {
    return photoPath;
  }

  // Full HTTP URL (non-localhost) — try to extract path
  if (photoPath.startsWith('http://')) {
    const match = photoPath.match(/\/uploads\/.+$/);
    if (match) {
      return `${baseUrl}${match[0]}`;
    }
    return photoPath;
  }
  
  // Relative path — prepend baseUrl
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `${baseUrl}${cleanPath}`;
}
