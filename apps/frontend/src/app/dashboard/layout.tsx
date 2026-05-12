'use client';

import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Menu, AlertCircle, Bell, User, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
          
          <div className="flex-1 flex items-center justify-end gap-2 relative">
             <button className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
               <Bell className="w-5 h-5" />
             </button>
             
             <div className="relative">
               <button 
                 onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                 className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden active:scale-95 transition-transform"
               >
                  {user?.photoUrl ? (
                    <img src={user.photoUrl} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 text-slate-400" />
                  )}
               </button>

               <AnimatePresence>
                 {isProfileMenuOpen && (
                   <>
                     <div 
                       className="fixed inset-0 z-10" 
                       onClick={() => setIsProfileMenuOpen(false)} 
                     />
                     <motion.div
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute right-0 mt-3 w-48 bg-white rounded-[1.5rem] shadow-2xl border border-slate-100 p-2 z-20"
                     >
                       <div className="px-4 py-3 border-b border-slate-50 mb-1">
                         <p className="text-xs font-black text-slate-900 truncate uppercase tracking-tighter">
                           {user?.name || 'Usuário'}
                         </p>
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                           {user?.role?.includes('ADMIN') ? 'Administrador' : 'Colaborador'}
                         </p>
                       </div>
                       <button
                         onClick={() => {
                           setIsProfileMenuOpen(false);
                           logout();
                         }}
                         className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors font-bold text-xs uppercase tracking-widest"
                       >
                         <LogOut className="w-4 h-4" />
                         Sair do Sistema
                       </button>
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>
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
