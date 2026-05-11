'use client';

import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Menu, AlertCircle, Bell, User } from "lucide-react";
import Link from "next/link";
import { useBranding } from "@/components/BrandingProvider";

const routePermissions: Record<string, { permission?: string, roles?: string[] }> = {
  '/dashboard/financial': { permission: 'financial_view' },
  '/dashboard/documents': { permission: 'docs_view' },
  '/dashboard/users': { permission: 'users_view' },
  '/dashboard/team': { roles: ['ADMIN', 'OWNER'] },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasAccess, setHasAccess] = useState(true);
  const { branding } = useBranding();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    // Check permissions for the current route
    const requirements = routePermissions[pathname];
    if (requirements) {
      const hasRole = (r: string) => user.role.split(',').includes(r);
      const isSuperUser = hasRole('ADMIN') || hasRole('OWNER');
      let access = isSuperUser;

      if (!isSuperUser) {
        if (requirements.roles && !requirements.roles.some(r => hasRole(r))) {
          access = false;
        } else if (requirements.permission) {
          access = !!user.permissions?.[requirements.permission];
        } else {
          access = true;
        }
      }

      setHasAccess(access);
    } else {
      setHasAccess(true);
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-main flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen bg-main">
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
        <main className="flex-1 lg:ml-64 flex flex-col items-center justify-center p-8">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-rose-500" />
          </div>
          <h1 className="text-2xl font-bold text-main mb-2">Acesso Negado</h1>
          <p className="text-slate-400 text-center max-w-md mb-8">
            Você não tem as permissões necessárias para acessar esta funcionalidade. 
            Entre em contato com o administrador da sua conta.
          </p>
          <Link 
            href="/dashboard"
            className="px-8 py-4 rounded-2xl bg-primary text-white font-bold hover:bg-primary/80 transition-all"
            onClick={() => setHasAccess(true)}
          >
            Voltar ao Dashboard
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-main">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen relative">
        {/* Mobile Header Toggle - Premium Design */}
        <div className="lg:hidden sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-100 px-4 py-4 flex items-center justify-between z-40 shadow-sm">
          <div className="flex-1 flex justify-start">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2.5 bg-slate-50 text-slate-600 hover:text-primary rounded-2xl transition-all active:scale-90 border border-slate-100"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="text-[10px] font-black text-primary">SLX</span>
              </div>
            )}
            <span className="font-black text-xs tracking-widest uppercase text-slate-900 truncate max-w-[100px]">
              {branding?.name || 'SLX Imob'}
            </span>
          </div>
          
          <div className="flex-1 flex items-center justify-end gap-2">
             <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
               <Bell className="w-5 h-5" />
             </button>
             <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
                {user?.photoUrl ? (
                  <img src={user.photoUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-4 h-4 text-slate-400" />
                )}
             </div>
          </div>
        </div>

        <main className="flex-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 px-3 py-4 sm:p-8 lg:p-12">
            <div className="w-full max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
