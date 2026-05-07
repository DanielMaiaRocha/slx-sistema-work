'use client';

import { Receipt, Search, Filter, Download, Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { useBranding } from '@/components/BrandingProvider';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export default function FinancialPage() {
  const { branding } = useBranding();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState<any>(null);
  
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isMonthSelectOpen, setIsMonthSelectOpen] = useState(false);
  
  const statusRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({ 
    search: '', 
    status: '',
    periodType: 'month', 
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });

  const LIMIT = 15;

  useEffect(() => {
    async function loadInvoices() {
      setLoading(true);
      try {
        const offset = page * LIMIT;
        let query = `/financial/all?offset=${offset}&limit=${LIMIT}`;
        if (filters.search) query += `&search=${encodeURIComponent(filters.search)}`;
        if (filters.status) query += `&status=${encodeURIComponent(filters.status)}`;
        
        if (filters.periodType === 'month') {
          query += `&month=${filters.month}&year=${filters.year}`;
        } else if (filters.periodType === 'week') {
          const start = format(startOfWeek(new Date()), 'yyyy-MM-dd');
          const end = format(endOfWeek(new Date()), 'yyyy-MM-dd');
          query += `&startDate=${start}&endDate=${end}`;
        } else if (filters.periodType === 'custom' && filters.startDate && filters.endDate) {
          query += `&startDate=${filters.startDate}&endDate=${filters.endDate}`;
        } else if (filters.periodType === 'all') {
          query += `&allMonths=true`;
        } else if (filters.periodType === 'date' && filters.startDate) {
           query += `&startDate=${filters.startDate}&endDate=${filters.startDate}`;
        }
        
        const response = await fetchApi(query);
        setInvoices(response.data || []);
        setPagination(response.pagination);
      } catch (error) {
        console.error('Failed to load invoices:', error);
      } finally {
        setLoading(false);
      }
    }
    loadInvoices();
  }, [page, filters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(event.target as Node)) setIsStatusOpen(false);
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) setIsPeriodOpen(false);
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) setIsMonthSelectOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFilterChange = (name: string, value: any) => {
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(0);
  };

  const totalPages = pagination ? Math.ceil(pagination.total / LIMIT) : 0;
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(0, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  const statusOptions = [
    { label: 'Todos os Status', value: '' },
    { label: 'Pago', value: 'Pago' },
    { label: 'Pendente', value: 'Pendente' },
    { label: 'Atrasado', value: 'Atrasado' },
  ];

  const periodOptions = [
    { label: 'Mês Atual', value: 'month' },
    { label: 'Esta Semana', value: 'week' },
    { label: 'Por Data', value: 'date' },
    { label: 'Período Personalizado', value: 'custom' },
    { label: 'Todos os Meses', value: 'all' },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Financeiro</h1>
          <p className="text-slate-500 text-xs font-medium mt-1">Gerencie todos os boletos gerados (Base Asaas).</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="relative lg:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            placeholder="Buscar por descrição ou nome..."
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 focus:border-primary/50 outline-none transition-all text-sm shadow-sm"
          />
        </div>

        <div className="relative" ref={statusRef}>
          <button 
            onClick={() => setIsStatusOpen(!isStatusOpen)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 flex items-center justify-between hover:border-primary/30 transition-all group cursor-pointer text-sm shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Filter className={`w-5 h-5 ${filters.status ? 'text-primary' : 'text-slate-400'}`} />
              <span className={filters.status ? 'text-slate-900 font-bold' : 'text-slate-400 font-medium'}>
                {statusOptions.find(o => o.value === filters.status)?.label || 'Todos os Status'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-primary transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isStatusOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
              >
                {statusOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { handleFilterChange('status', opt.value); setIsStatusOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                      filters.status === opt.value ? 'text-primary bg-primary/5 font-black' : 'text-slate-600 font-medium'
                    }`}
                  >
                    {opt.label}
                    {filters.status === opt.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="relative" ref={periodRef}>
          <button 
            onClick={() => setIsPeriodOpen(!isPeriodOpen)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 flex items-center justify-between hover:border-primary/30 transition-all group cursor-pointer text-sm shadow-sm"
          >
            <div className="flex items-center gap-3">
              <Calendar className={`w-5 h-5 ${filters.periodType ? 'text-primary' : 'text-slate-400'}`} />
              <span className="text-slate-900 font-bold">
                {periodOptions.find(o => o.value === filters.periodType)?.label}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-primary transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isPeriodOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
              >
                {periodOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { handleFilterChange('periodType', opt.value); setIsPeriodOpen(false); }}
                    className={`w-full text-left px-4 py-3 text-sm transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                      filters.periodType === opt.value ? 'text-primary bg-primary/5 font-black' : 'text-slate-600 font-medium'
                    }`}
                  >
                    {opt.label}
                    {filters.periodType === opt.value && <Check className="w-4 h-4" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {(filters.periodType === 'month' || filters.periodType === 'custom' || filters.periodType === 'date') && (
          <motion.div 
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="z-40"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
              {filters.periodType === 'month' && (
                <>
                  <div className="space-y-2" ref={monthRef}>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-[0.2em]">Mês</label>
                    <div className="relative">
                      <button 
                        onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm outline-none flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer shadow-sm"
                      >
                        <span className="font-bold">{months[filters.month]}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isMonthSelectOpen ? 'rotate-180' : ''}`} />
                      </button>
                      <AnimatePresence>
                        {isMonthSelectOpen && (
                          <motion.div 
                            initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                            className="absolute z-50 top-full left-0 right-0 mt-2 max-h-60 overflow-y-auto scrollbar-hide bg-white border border-slate-200 rounded-2xl shadow-2xl"
                          >
                            {months.map((m, i) => (
                              <button key={i} onClick={() => { handleFilterChange('month', i); setIsMonthSelectOpen(false); }} className={`w-full text-left px-4 py-3 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${filters.month === i ? 'text-primary bg-primary/5 font-black' : 'text-slate-600 font-medium'}`}>
                                {m}
                                {filters.month === i && <Check className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-[0.2em]">Ano</label>
                    <input 
                      type="number"
                      value={filters.year}
                      onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm font-bold outline-none focus:border-primary/50 transition-all shadow-sm"
                    />
                  </div>
                </>
              )}
              {(filters.periodType === 'custom' || filters.periodType === 'date') && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-[0.2em]">
                    {filters.periodType === 'date' ? 'Data Selecionada' : 'Data Inicial'}
                  </label>
                  <input 
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm font-bold outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              )}
              {filters.periodType === 'custom' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-[0.2em]">Data Final</label>
                  <input 
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm font-bold outline-none focus:border-primary/50 transition-all shadow-sm"
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="glass-card overflow-hidden bg-white shadow-sm border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Descrição / Cliente</th>
                <th className="p-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Vencimento</th>
                <th className="p-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Valor</th>
                <th className="p-4 text-slate-400 font-black text-[10px] uppercase tracking-widest">Status</th>
                <th className="p-4 text-slate-400 font-black text-[10px] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">Sincronizando dados com Asaas...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">Nenhum registro encontrado para este filtro.</td></tr>
              ) : invoices.map((invoice, i) => (
                <motion.tr 
                  key={invoice.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.01 }}
                  className="hover:bg-slate-50 transition-colors group"
                >
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div 
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-sm"
                        style={{ color: branding?.primaryColor || '#FFC107' }}
                      >
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold text-sm leading-tight">{invoice.description || 'Aluguel Mensal'}</div>
                        <div className="text-slate-500 text-[9px] font-black uppercase tracking-[0.15em] mt-1">{invoice.customerName || 'Cliente'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-slate-600 text-sm font-bold">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-4 text-slate-900 font-black text-sm">{formatCurrency(invoice.amount)}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                      invoice.status === 'Pago' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                      invoice.status === 'Atrasado' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                      'bg-amber-500/10 text-amber-500 border-amber-500/20'
                    }`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200 shadow-sm">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30">
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
            {invoices.length} de {pagination?.total || 0} encontrados
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              disabled={page === 0 || loading}
              onClick={() => setPage(p => p - 1)}
              className="p-2.5 bg-white text-slate-400 rounded-xl disabled:opacity-30 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed border border-slate-200 shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 mx-2">
              {getPageNumbers().map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    page === p 
                      ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' 
                      : 'text-slate-400 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              {totalPages > 5 && getPageNumbers()[getPageNumbers().length - 1] < totalPages - 1 && (
                <>
                  <span className="text-slate-300 px-1 text-xs font-black">...</span>
                  <button onClick={() => setPage(totalPages - 1)} className="w-9 h-9 rounded-xl text-xs font-black text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 transition-all cursor-pointer">
                    {totalPages}
                  </button>
                </>
              )}
            </div>
            <button 
              disabled={!pagination?.total || (page + 1) * LIMIT >= pagination.total || loading}
              onClick={() => setPage(p => p + 1)}
              className="p-2.5 bg-white text-slate-400 rounded-xl disabled:opacity-30 hover:text-slate-900 hover:bg-slate-50 transition-all cursor-pointer disabled:cursor-not-allowed border border-slate-200 shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
