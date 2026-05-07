'use client';

import { 
  Users, 
  Receipt, 
  CreditCard,
  Plus,
  Shield,
  Clock,
  ExternalLink,
  ChevronDown,
  Calendar,
  ArrowRight,
  ShieldCheck,
  FileText,
  FileCode,
  FileCheck,
  Search,
  Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [branding, setBranding] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const hasPerm = (perm: string) => {
    if (user?.role === 'ADMIN' || user?.role === 'OWNER') return true;
    if (user?.role === 'TENANT') {
      return !!user?.permissions?.[perm];
    }
    return false;
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [stats, brand] = await Promise.all([
          fetchApi(`/dashboard/stats?month=${month}&year=${year}`),
          fetchApi('/settings/branding')
        ]);
        setData(stats);
        setBranding(brand);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [month, year]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMonthOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const statsCards = [
    { 
      label: 'Total de Boletos', 
      value: data?.counts?.boletos || 0, 
      sub: `Em ${months[month]}`,
      icon: Receipt, 
      color: 'text-primary',
      link: '/dashboard/financial',
      permission: 'financial_view'
    },
    { 
      label: 'Usuários Totais', 
      value: data?.counts?.users || 0, 
      sub: 'Base cadastrada',
      icon: Users, 
      color: 'text-secondary',
      link: '/dashboard/users',
      permission: 'users_view'
    },
    { 
      label: 'Proprietários', 
      value: data?.counts?.owners || 0, 
      sub: 'Locadores ativos',
      icon: Shield, 
      color: 'text-emerald-500',
      link: '/dashboard/users?role=OWNER',
      permission: 'users_view'
    },
    { 
      label: 'Inquilinos', 
      value: data?.counts?.tenants || 0, 
      sub: 'Locatários ativos',
      icon: Users, 
      color: 'text-amber-500',
      link: '/dashboard/users?role=TENANT',
      permission: 'users_view'
    },
  ].filter(card => (!card.permission || hasPerm(card.permission)) && branding?.config?.dashboard?.showStats !== false);

  const recentDocs = [
    { name: 'Contrato de Aluguel - Unidade 402.pdf', date: '2 horas atrás', type: 'PDF', size: '1.2 MB' },
    { name: 'Termo de Vistoria Entrada.docx', date: 'Ontem às 14:20', type: 'DOCX', size: '850 KB' },
    { name: 'Comprovante de IPTU - 2026.pdf', date: '2 dias atrás', type: 'PDF', size: '420 KB' },
    { name: 'Seguro Fiança - Apólice.pdf', date: '5 dias atrás', type: 'PDF', size: '2.1 MB' },
  ];

  const showQuickActions = branding?.config?.dashboard?.showQuickActions !== false;
  const showBalance = branding?.config?.dashboard?.showBalance !== false;
  const showDocs = branding?.config?.dashboard?.showDocs !== false;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-0.5">
          <motion.h2 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-slate-500 text-sm font-medium"
          >
            Olá, {user?.name || data?.welcomeName || 'Administrador'}
          </motion.h2>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-2xl lg:text-3xl font-black text-slate-900 tracking-tight"
          >
            {branding?.config?.welcomeMessage || 'Bem-vindo ao Painel SLX'}
          </motion.h1>
          <div className="flex items-center gap-2 text-slate-500 text-xs mt-1">
            <Clock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Sincronizado {data?.lastSync ? formatDistanceToNow(new Date(data.lastSync), { addSuffix: true, locale: ptBR }) : '...'}</span>
          </div>
        </div>

        {/* Month Filter */}
        <div className="relative w-full sm:w-auto" ref={dropdownRef}>
          <button 
            onClick={() => setIsMonthOpen(!isMonthOpen)}
            className="w-full sm:w-auto bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-900 flex items-center justify-between sm:justify-start gap-4 hover:border-primary/50 transition-all group cursor-pointer text-sm shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="font-semibold">{months[month]} {year}</span>
            </div>
            <ChevronDown className={`w-3 h-3 text-slate-400 group-hover:text-primary transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isMonthOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 5, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.98 }}
                className="absolute z-50 top-full right-0 mt-2 w-full sm:w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
              >
                <div className="max-h-60 overflow-y-auto scrollbar-hide">
                  {months.map((m, idx) => (
                    <button
                      key={m}
                      onClick={() => {
                        setMonth(idx);
                        setIsMonthOpen(false);
                      }}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                        month === idx ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Stats Grid */}
      {branding?.config?.dashboard?.showStats !== false && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full">
          {statsCards.map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 group relative overflow-hidden flex flex-col justify-between min-h-[160px] shadow-sm bg-white"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{stat.label}</p>
                  <h3 className="text-3xl font-black text-slate-900 leading-tight">
                    {loading ? '...' : stat.value}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-medium">{stat.sub}</p>
                </div>
                <div 
                  className="bg-slate-50 p-2.5 rounded-xl border border-slate-100"
                  style={{ color: branding?.primaryColor || '#FFC107' }}
                >
                  <stat.icon className="w-5 h-5" />
                </div>
              </div>
              
              {stat.link && (
                <Link 
                  href={stat.link}
                  className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-900 font-black hover:text-primary cursor-pointer group/link uppercase tracking-widest"
                >
                  Detalhes
                  <ArrowRight className="w-3 h-3 group-hover/link:translate-x-0.5 transition-all" />
                </Link>
              )}
            </motion.div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Latest Documents Section */}
        {(hasPerm('docs_view') && showDocs) && (
          <div className="lg:col-span-7">
            <div className="glass-card flex flex-col h-full bg-white border-slate-200 shadow-sm">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileCheck className="w-5 h-5 text-primary" style={{ color: branding?.primaryColor }} />
                  </div>
                  <div>
                    <h3 className="text-slate-900 font-bold text-base leading-tight">Últimos Documentos</h3>
                    <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Gestão de arquivos e contratos</p>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 p-2 space-y-1">
                {recentDocs.map((doc, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + (i * 0.05) }}
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 transition-all group border border-transparent hover:border-slate-100 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/5 transition-all">
                        <FileText className="w-5 h-5" style={branding?.primaryColor ? { color: branding.primaryColor } : {}} />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold text-sm leading-tight">{doc.name}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-400 text-[10px] font-medium">{doc.date}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-200"></span>
                          <span className="text-slate-500 text-[10px] font-bold">{doc.size}</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Financial Sidebar & Quick Actions */}
        <div className={(hasPerm('docs_view') && showDocs) ? "lg:col-span-5 space-y-6" : "lg:col-span-12 space-y-6"}>
          {(hasPerm('financial_view') && showBalance) && (
            <div 
              className="glass-card p-8 relative overflow-hidden group flex flex-col justify-between min-h-[200px] shadow-sm bg-white border-slate-200"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-2.5 rounded-xl border border-primary/20 shadow-sm">
                    <CreditCard className="text-primary w-5 h-5" />
                  </div>
                  <h3 className="text-slate-900 font-bold text-sm uppercase tracking-wider">Saldo em Carteira</h3>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Disponível no Asaas</p>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                    {loading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data?.financial?.balance || 0)}
                  </h2>
                </div>
              </div>
              
            </div>
          )}

          {showQuickActions && (
            <div className="glass-card p-6 border-slate-200 space-y-4 bg-white shadow-sm">
              <h3 className="text-slate-900 font-bold text-sm flex items-center gap-2 uppercase tracking-widest text-[10px]">
                <Plus className="w-4 h-4 text-primary" style={{ color: branding?.primaryColor }} />
                Ações Rápidas
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {hasPerm('financial_edit') && (
                  <button className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-primary/20 transition-all group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/5 p-2 rounded-lg">
                        <Receipt className="w-4 h-4 text-primary" style={{ color: branding?.primaryColor }} />
                      </div>
                      <span className="text-slate-900 text-sm font-bold">Novo Boleto</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-primary transition-all" />
                  </button>
                )}

                {/* Custom Quick Links in Dash */}
                {branding?.config?.quickLinks?.map((link: any) => (
                  <a 
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    className="w-full flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-primary/20 transition-all group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg border border-slate-100">
                        <ExternalLink className="w-4 h-4 text-slate-900" />
                      </div>
                      <span className="text-slate-900 text-sm font-bold">{link.label}</span>
                    </div>
                    <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-primary transition-all" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
