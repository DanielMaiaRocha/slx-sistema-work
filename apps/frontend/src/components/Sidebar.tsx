'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Receipt, 
  FileText, 
  Users, 
  Settings, 
  LogOut,
  ShieldCheck,
  ClipboardCheck,
  X,
  Menu,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { useBranding } from '@/components/BrandingProvider';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Receipt, label: 'Financeiro', href: '/dashboard/financial', permission: 'financial_view' },
  { icon: FileText, label: 'Documentos', href: '/dashboard/documents', permission: 'docs_view' },
  { icon: ClipboardCheck, label: 'Vistorias', href: '/dashboard/inspections' },
  { icon: Users, label: 'Usuários', href: '/dashboard/users', permission: 'users_view' },
  { icon: ShieldCheck, label: 'Equipe', href: '/dashboard/team', roles: ['ADMIN', 'OWNER'] },
  { icon: Settings, label: 'Configurações', href: '/dashboard/settings' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { branding } = useBranding();

  const filteredItems = menuItems.filter(item => {
    if (user?.role === 'ADMIN' || user?.role === 'OWNER') return true;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    if (item.permission && user?.role === 'TENANT') {
      return user?.permissions?.[item.permission];
    }
    return true;
  });

  const primaryColor = branding?.primaryColor || '#FFC107';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden cursor-pointer"
          />
        )}
      </AnimatePresence>

      <aside 
        className={cn(
          "w-64 bg-[#0a0c10] border-r border-white/5 flex flex-col h-screen fixed left-0 top-0 z-50 transition-transform duration-300 ease-in-out lg:translate-x-0 shadow-2xl",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {branding?.logoUrl ? (
              <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 bg-white p-1 border border-white/10">
                <img src={branding.logoUrl} alt={branding.name} className="w-full h-full object-contain" />
              </div>
            ) : (
              <div 
                style={{ background: `#FFFFFF` }}
                className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shrink-0"
              >
                <ShieldCheck className="text-[#000000] w-7 h-7" />
              </div>
            )}
            <span className="font-black text-xl tracking-tight text-white line-clamp-2">
              {branding?.name || 'SLX Imobiliária'}
            </span>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white lg:hidden transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto scrollbar-hide">
          <div className="px-6 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Menu Principal</div>
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link 
                key={item.href}
                href={item.href}
                onClick={() => { if (window.innerWidth < 1024) onClose(); }}
                className={cn(
                  "flex items-center gap-3 px-6 py-4 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                  isActive 
                    ? "bg-white/5 text-white font-bold" 
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="active-pill"
                    className="absolute left-0 w-1.5 h-6 rounded-r-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                )}
                <item.icon className={cn(
                  "w-5 h-5 transition-colors",
                  isActive ? "text-white" : "text-slate-500 group-hover:text-white"
                )} />
                <span className="text-sm tracking-wide">{item.label}</span>
              </Link>
            );
          })}

          {/* Custom Quick Links */}
          {branding?.config?.quickLinks?.length > 0 && (
            <div className="pt-6 mt-6 border-t border-white/5">
              <div className="px-6 mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Links Externos</div>
              {branding.config.quickLinks.map((link: any) => (
                <a 
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  className="flex items-center justify-between px-6 py-4 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-sm font-medium tracking-tight">{link.label}</span>
                  </div>
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              ))}
            </div>
          )}
        </nav>

        <div className="p-6 mt-auto border-t border-white/5">
          <button 
            onClick={logout}
            className="flex items-center gap-3 px-6 py-4 rounded-2xl text-rose-500 hover:bg-rose-500/10 w-full transition-all cursor-pointer font-bold group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
};
