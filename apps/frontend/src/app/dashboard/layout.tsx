'use client';

import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Menu, AlertCircle } from "lucide-react";
import Link from "next/link";

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

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push('/');
      return;
    }

    // Check permissions for the current route
    const requirements = routePermissions[pathname];
    if (requirements) {
      const isSuperUser = user.role === 'ADMIN' || user.role === 'OWNER';
      let access = isSuperUser;

      if (!isSuperUser) {
        if (requirements.roles && !requirements.roles.includes(user.role)) {
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
        {/* Mobile Header Toggle */}
        <div className="lg:hidden p-4 border-b border-white/5 flex items-center justify-between sticky top-0 bg-main/80 backdrop-blur-xl z-30 shrink-0">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-main hover:bg-white/5 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="text-main font-black text-sm tracking-widest uppercase">SLX Imob</span>
          <div className="w-10"></div>
        </div>

        <main className="flex-1 relative">
          <div className="absolute top-0 right-0 w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
          
          <div className="relative z-10 p-6 sm:p-10 lg:p-12">
            <div className="max-w-7xl mx-auto w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
