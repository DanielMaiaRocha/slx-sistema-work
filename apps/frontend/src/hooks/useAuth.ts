import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://slx-sistema-work-production.up.railway.app/api';

export const useAuth = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = Cookies.get('token') || localStorage.getItem('token');
    const storedUser = Cookies.get('user') || localStorage.getItem('user');

    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        // Sync back to both if only one was present
        if (!Cookies.get('token')) Cookies.set('token', token, { expires: 7, path: '/', sameSite: 'lax' });
        if (!localStorage.getItem('token')) localStorage.setItem('token', token);
      } catch (e) {
        console.error('Failed to parse stored user', e);
      }
    }
    setLoading(false);
  }, []);

  const login = async (identifier: string, password: string, tenantSlug: string, intendedRole?: string) => {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-tenant-slug': tenantSlug 
        },
        body: JSON.stringify({ identifier, password, intendedRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }

      const { token, user } = await response.json();
      
      const cookieOptions = { expires: 7, path: '/', sameSite: 'lax' as const };
      Cookies.set('token', token, cookieOptions);
      Cookies.set('user', JSON.stringify(user), cookieOptions);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Login failed' };
    }
  };

  const logout = () => {
    Cookies.remove('token', { path: '/' });
    Cookies.remove('user', { path: '/' });
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    window.location.href = '/';
  };

  return { user, login, logout, loading };
};
