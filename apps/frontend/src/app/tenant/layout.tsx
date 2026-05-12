'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { 
  CreditCard, 
  FileText, 
  MessageCircle, 
  LogOut, 
  User as UserIcon,
  Bell,
  FolderOpen
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [hasNotifications, setHasNotifications] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  useEffect(() => {
    const role = Cookies.get('user_role');
    const token = Cookies.get('token');
    
    const roleStr = role || '';
    const hasAccess = roleStr.includes('TENANT');

    if (!token || !hasAccess) {
      router.push('/login/inquilinos');
    } else {
      setLoading(false);
      // Check for notifications (pending bills)
      import('@/lib/api').then(({ fetchApi }) => {
        fetchApi('/tenant/bills')
          .then(data => {
            const pending = data.filter((b: any) => b.status !== 'PAGO').length;
            setHasNotifications(pending > 0);
          })
          .catch(err => console.error('Notification check error:', err));
      });
    }
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navItems = [
    { label: 'Boletos', icon: CreditCard, href: '/tenant/dashboard' },
    { label: 'Documentos', icon: FolderOpen, href: '/tenant/documents' },
    { label: 'Contrato', icon: FileText, href: '/tenant/contract' },
    { label: 'Suporte', icon: MessageCircle, href: '/tenant/support' },
  ];

  const userName = Cookies.get('user_name') || 'Inquilino';
  const tenantLogo = Cookies.get('tenant_logo');

  return (
    <div className="min-h-screen bg-white flex flex-col md:flex-row font-sans selection:bg-primary selection:text-black">
      {/* Sidebar for Desktop - Now Pure Black */}
      <aside className="hidden md:flex flex-col w-72 h-screen fixed left-0 top-0 bg-black border-r border-white/5 z-40 overflow-hidden">
        <div className="p-10 border-b border-white/5 flex flex-col items-center gap-6">
           <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center p-4 shadow-2xl shadow-primary/10 overflow-hidden">
              {tenantLogo ? (
                <img src={tenantLogo} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <div className="text-black font-black text-2xl tracking-tighter">SLX</div>
              )}
           </div>
           <div className="text-center space-y-1.5">
             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">Inquilino SLX</span>
             <h2 className="text-base font-black text-white leading-tight tracking-tight truncate max-w-[200px]">
               {userName}
             </h2>
           </div>
        </div>

        <nav className="flex-1 p-6 space-y-3 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-6 py-5 rounded-[1.5rem] font-bold uppercase tracking-[0.2em] text-[10px] transition-all group relative overflow-hidden",
                pathname === item.href 
                  ? "text-black bg-primary shadow-2xl shadow-primary/30" 
                  : "text-slate-500 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon className={cn("w-4.5 h-4.5", pathname === item.href ? "text-black" : "group-hover:text-white")} />
              {item.label}
              {pathname === item.href && (
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-black rounded-full mr-6" />
              )}
            </Link>
          ))}
        </nav>

        <div className="p-8 border-t border-white/5 space-y-4">
          <button className="w-full py-4.5 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-3 relative">
            <div className="relative">
              <Bell className="w-4 h-4" />
              {hasNotifications && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full border border-black animate-pulse" />
              )}
            </div>
            Notificações
          </button>
          <button 
            onClick={() => {
              Cookies.remove('token');
              Cookies.remove('user_role');
              Cookies.remove('user_name');
              Cookies.remove('tenant_logo');
              router.push('/login/inquilinos');
            }}
            className="w-full py-4.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-3"
          >
            <LogOut className="w-4 h-4" />
            Sair do Portal
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-72 flex flex-col min-h-screen bg-white">
        {/* Mobile Header - Light Theme */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-100 p-5 flex items-center justify-between md:hidden">
           <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-2.5 shadow-xl shadow-slate-200/50 overflow-hidden">
                 {tenantLogo ? (
                   <img src={tenantLogo} alt="Logo" className="w-full h-full object-contain" />
                 ) : (
                   <span className="text-black font-black text-xs">SLX</span>
                 )}
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-slate-400">Inquilino</span>
                <h2 className="text-sm font-extrabold text-slate-900 tracking-tight leading-tight uppercase">
                  {userName.split(' ')[0]}
                </h2>
              </div>
           </div>
           <div className="flex items-center gap-3 relative">
              <button className="w-11 h-11 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 relative">
                 <Bell className="w-5 h-5" />
                 {hasNotifications && (
                   <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border border-white animate-pulse" />
                 )}
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="w-11 h-11 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-200 overflow-hidden active:scale-95 transition-transform"
                >
                   <UserIcon className="w-6 h-6" />
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
                            {userName}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            Portal do Inquilino
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            setIsProfileMenuOpen(false);
                            Cookies.remove('token', { path: '/' });
                            Cookies.remove('user', { path: '/' });
                            Cookies.remove('user_role', { path: '/' });
                            Cookies.remove('user_name', { path: '/' });
                            Cookies.remove('tenant_logo', { path: '/' });
                            localStorage.removeItem('token');
                            localStorage.removeItem('user');
                            router.push('/login/inquilinos');
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-500 hover:bg-rose-50 transition-colors font-bold text-xs uppercase tracking-widest"
                        >
                          <LogOut className="w-4 h-4" />
                          Sair do Portal
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
           </div>
        </header>

        {/* Desktop Top Bar - Premium Light Look */}
        <div className="hidden md:flex items-center justify-between px-12 py-10">
           <div className="space-y-1.5">
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                {pathname === '/tenant/dashboard' ? 'Financeiro' : 
                 pathname === '/tenant/contract' ? 'Meu Contrato' : 
                 pathname === '/tenant/support' ? 'Suporte' : 'Portal'}
              </h1>
              <p className="text-slate-400 font-bold tracking-wide text-xs uppercase opacity-70">Área exclusiva para inquilinos SLX</p>
           </div>
           <div className="flex items-center gap-8">
              <div className="flex flex-col items-end">
                 <span className="text-slate-900 font-black text-sm tracking-tight">{userName}</span>
                 <span className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Portal do Inquilino</span>
              </div>
              <div className="w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-xl shadow-slate-100/50">
                 <UserIcon className="w-7 h-7" />
              </div>
           </div>
        </div>

        <main className="flex-1 p-6 md:p-12 md:pt-4 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>

      {/* Bottom Navigation (Mobile Only) - Light Theme */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-3xl border-t border-slate-100 px-8 py-5 flex items-center justify-between md:hidden shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <Link 
            key={item.href} 
            href={item.href}
            className={cn(
              "flex flex-col items-center gap-1.5 transition-all relative",
              pathname === item.href ? "text-primary scale-110" : "text-slate-300"
            )}
          >
            <item.icon className={cn("w-6 h-6", pathname === item.href ? "" : "")} />
            <span className="text-[9px] font-black uppercase tracking-[0.15em]">{item.label}</span>
            {pathname === item.href && (
              <div className="absolute -top-2 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(250,204,21,1)]" />
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}
