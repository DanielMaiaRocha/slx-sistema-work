import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://slx-sistema-work-production.up.railway.app/api';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
  const token = Cookies.get('token');
  const tenantSlug = 'slx'; // Hardcoded for now as per requirements

  const isFormData = options.body instanceof FormData;

  const headers: any = {
    'x-tenant-slug': tenantSlug,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let body = options.body;
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
    if (body && typeof body === 'object' && !(body instanceof Blob)) {
      body = JSON.stringify(body);
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
    body,
    credentials: 'include', // Send cookies with requests
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      try {
        const textError = await response.text();
        if (textError) errorMessage = textError;
      } catch {}
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return response.text();
};
