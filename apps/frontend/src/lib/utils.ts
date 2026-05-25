import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getAssetUrl(photoPath: string | null | undefined): string {
  if (!photoPath) return "";
  if (photoPath.startsWith('http') || photoPath.startsWith('blob:')) {
    return photoPath;
  }
  
  // Get API URL and strip trailing '/api' or '/api/'
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://slx-sistema-work-production.up.railway.app/api';
  const baseUrl = apiUrl.replace(/\/api\/?$/, '');
  
  // Ensure photoPath has a leading slash
  const cleanPath = photoPath.startsWith('/') ? photoPath : `/${photoPath}`;
  return `${baseUrl}${cleanPath}`;
}
