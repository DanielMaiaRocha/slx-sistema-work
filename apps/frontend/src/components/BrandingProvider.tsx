'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';

interface BrandingContextType {
  branding: any;
  refreshBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<any>(null);

  const refreshBranding = async () => {
    try {
      const data = await fetchApi('/settings/branding');
      setBranding(data);
      applyBranding(data);
    } catch (e) {
      console.error('Failed to load branding:', e);
    }
  };

  const applyBranding = (data: any) => {
    if (!data) return;
    
    const root = document.documentElement;
    if (data.primaryColor) root.style.setProperty('--primary', data.primaryColor);
    if (data.secondaryColor) root.style.setProperty('--secondary', data.secondaryColor);
    
    if (data.config?.sidebarColor) root.style.setProperty('--sidebar', data.config.sidebarColor);
    if (data.config?.textColor) root.style.setProperty('--foreground', data.config.textColor);
    
    // Theme
    if (data.config?.theme === 'light') {
      root.classList.add('light');
    } else {
      root.classList.remove('light');
    }
  };

  useEffect(() => {
    refreshBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, refreshBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error('useBranding must be used within a BrandingProvider');
  }
  return context;
}
