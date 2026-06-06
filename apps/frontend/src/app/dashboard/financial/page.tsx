'use client';

import { Receipt, Search, Filter, Download, Calendar, ChevronDown, ChevronLeft, ChevronRight, Check, Clock, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { startOfWeek, endOfWeek, format } from 'date-fns';
import { useBranding } from '@/components/BrandingProvider';
import UserDetailModal from '@/components/UserDetailModal';
import ReconciliationPanel from '@/components/ReconciliationPanel';
import DatePicker from '@/components/DatePicker';

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

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<{ id: string; name: string } | null>(null);

  const openCustomerDetail = (invoice: any) => {
    if (!invoice.customerId) return;
    setDetailUser({ id: invoice.customerId, name: invoice.customerName });
    setIsDetailOpen(true);
  };

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    periodType: 'month',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: '',
    endDate: ''
  });

  // Search is debounced: it resolves names + pulls boletos across the period,
  // so we don't want to fire it on every keystroke.
  const [searchInput, setSearchInput] = useState('');

  const [tab, setTab] = useState<'boletos' | 'reconciliation'>('boletos');

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters(prev => (prev.search === searchInput ? prev : { ...prev, search: searchInput }));
      setPage(0);
    }, 450);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
    { label: 'Período', value: 'custom' },
    { label: 'Todos', value: 'all' },
  ];

  const getStatusColor = (status: string) => {
    if (status === 'Pago') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
    if (status === 'Atrasado') return 'bg-rose-50 text-rose-600 border-rose-200';
    return 'bg-amber-50 text-amber-600 border-amber-200';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'Pago') return <CheckCircle2 className="w-3 h-3" />;
    if (status === 'Atrasado') return <AlertTriangle className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  return (
    <div className="w-full py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Financeiro</h1>
        <p className="text-slate-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.15em]">
          {tab === 'boletos' ? 'Boletos sincronizados com Asaas' : 'Conciliação bancária do extrato Asaas'}
        </p>
      </div>

      {/* Tabs */}
      <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
        <button
          onClick={() => setTab('boletos')}
          className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === 'boletos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Receipt className="w-3.5 h-3.5" /> Boletos
        </button>
        <button
          onClick={() => setTab('reconciliation')}
          className={`inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${tab === 'reconciliation' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          <Scale className="w-3.5 h-3.5" /> Conciliação
        </button>
      </div>

      {tab === 'reconciliation' ? (
        <ReconciliationPanel />
      ) : (
      <>
      {/* Filters */}
      <div className="glass-card p-4 sm:p-6 space-y-3 bg-white border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Buscar por descrição ou nome do inquilino..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-primary/50 focus:bg-white outline-none transition-all text-sm placeholder:text-slate-300"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="relative" ref={statusRef}>
            <button 
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Filter className={`w-3.5 h-3.5 shrink-0 ${filters.status ? 'text-primary' : 'text-slate-400'}`} />
                <span className={`truncate ${filters.status ? 'text-slate-900 font-bold' : 'text-slate-400'}`}>
                  {filters.status || 'Status'}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isStatusOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isStatusOpen && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                  {statusOptions.map((opt) => (
                    <button key={opt.value} onClick={() => { handleFilterChange('status', opt.value); setIsStatusOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${filters.status === opt.value ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'}`}>
                      {opt.label}
                      {filters.status === opt.value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative" ref={periodRef}>
            <button 
              onClick={() => setIsPeriodOpen(!isPeriodOpen)}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-slate-900 font-bold truncate">
                  {periodOptions.find(o => o.value === filters.periodType)?.label}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isPeriodOpen && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                  {periodOptions.map((opt) => (
                    <button key={opt.value} onClick={() => { handleFilterChange('periodType', opt.value); setIsPeriodOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${filters.periodType === opt.value ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'}`}>
                      {opt.label}
                      {filters.periodType === opt.value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Period Sub-Filters */}
        <AnimatePresence>
          {(filters.periodType === 'month' || filters.periodType === 'custom' || filters.periodType === 'date') && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
                {filters.periodType === 'month' && (
                  <>
                    <div className="space-y-1" ref={monthRef}>
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mês</label>
                      <div className="relative">
                        <button onClick={() => setIsMonthSelectOpen(!isMonthSelectOpen)}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 text-xs font-bold text-slate-900 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer">
                          <span>{months[filters.month]}</span>
                          <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isMonthSelectOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isMonthSelectOpen && (
                            <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                              className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                              {months.map((m, i) => (
                                <button key={i} onClick={() => { handleFilterChange('month', i); setIsMonthSelectOpen(false); }}
                                  className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${filters.month === i ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'}`}>
                                  {m} {filters.month === i && <Check className="w-3.5 h-3.5" />}
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ano</label>
                      <input type="number" value={filters.year} onChange={(e) => handleFilterChange('year', parseInt(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 text-xs font-bold text-slate-900 outline-none hover:border-primary/30 focus:border-primary/50 focus:bg-white transition-all" />
                    </div>
                  </>
                )}
                {(filters.periodType === 'custom' || filters.periodType === 'date') && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">{filters.periodType === 'date' ? 'Data' : 'Início'}</label>
                    <DatePicker value={filters.startDate} onChange={(v) => handleFilterChange('startDate', v)}
                      max={filters.periodType === 'custom' ? (filters.endDate || undefined) : undefined}
                      placeholder={filters.periodType === 'date' ? 'Data' : 'Início'} />
                  </div>
                )}
                {filters.periodType === 'custom' && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Fim</label>
                    <DatePicker value={filters.endDate} onChange={(v) => handleFilterChange('endDate', v)}
                      min={filters.startDate || undefined} placeholder="Fim" />
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Cards */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="glass-card p-8 text-center text-slate-400 text-sm italic bg-white border-slate-200 shadow-sm">Sincronizando...</div>
        ) : invoices.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400 text-sm italic bg-white border-slate-200 shadow-sm">Nenhum registro encontrado.</div>
        ) : invoices.map((invoice, i) => (
          <motion.div 
            key={invoice.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.02 }}
            className="glass-card p-4 bg-white border-slate-200 shadow-sm space-y-3"
          >
            {/* Row 1: Description + Status */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 shrink-0 mt-0.5"
                style={{ color: branding?.primaryColor || '#FFC107' }}>
                <Receipt className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">{invoice.description || 'Aluguel Mensal'}</p>
                <button
                  onClick={() => openCustomerDetail(invoice)}
                  disabled={!invoice.customerId}
                  className="text-[10px] text-slate-400 mt-0.5 truncate text-left hover:text-primary disabled:hover:text-slate-400 transition-colors cursor-pointer disabled:cursor-default max-w-full"
                >
                  {invoice.customerName || 'Cliente'}
                </button>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider border shrink-0 ${getStatusColor(invoice.status)}`}>
                {getStatusIcon(invoice.status)}
                {invoice.status}
              </span>
            </div>

            {/* Row 2: Date + Value + Download */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Vencimento</p>
                  <p className="text-xs font-bold text-slate-600">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</p>
                </div>
                <div>
                  <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Valor</p>
                  <p className="text-sm font-black text-slate-900">{formatCurrency(invoice.amount)}</p>
                </div>
              </div>
              {invoice.invoiceUrl || invoice.bankSlipUrl ? (
                <a
                  href={invoice.invoiceUrl || invoice.bankSlipUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all active:scale-95 border border-slate-100"
                  title="Abrir boleto"
                >
                  <Download className="w-4 h-4" />
                </a>
              ) : (
                <button disabled className="p-2 text-slate-200 rounded-lg border border-slate-100 cursor-default">
                  <Download className="w-4 h-4" />
                </button>
              )}
            </div>
          </motion.div>
        ))}

        {/* Mobile Pagination */}
        {!loading && pagination && totalPages > 1 && (
          <div className="flex items-center justify-between pt-3">
            <p className="text-[9px] text-slate-400 font-bold">{page + 1}/{totalPages}</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 active:scale-90">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {getPageNumbers().slice(0, 3).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-bold ${page === p ? 'bg-primary text-white' : 'bg-white border border-slate-100 text-slate-400'}`}>
                  {p + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 active:scale-90">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block glass-card overflow-hidden bg-white shadow-sm border-slate-200 rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Descrição / Cliente</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Vencimento</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Valor</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Status</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">Sincronizando dados com Asaas...</td></tr>
              ) : invoices.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">Nenhum registro encontrado para este filtro.</td></tr>
              ) : invoices.map((invoice, i) => (
                <motion.tr key={invoice.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}
                  className="hover:bg-slate-50 transition-colors group">
                  <td className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 shadow-sm" style={{ color: branding?.primaryColor || '#FFC107' }}>
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold text-sm leading-tight">{invoice.description || 'Aluguel Mensal'}</div>
                        <button
                          onClick={() => openCustomerDetail(invoice)}
                          disabled={!invoice.customerId}
                          className="text-slate-500 text-[9px] font-black uppercase tracking-[0.15em] mt-1 hover:text-primary disabled:hover:text-slate-500 transition-colors cursor-pointer disabled:cursor-default text-left"
                          title={invoice.customerId ? 'Ver cadastro e boletos' : undefined}
                        >
                          {invoice.customerName || 'Cliente'}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-slate-600 text-sm font-bold">{new Date(invoice.dueDate).toLocaleDateString('pt-BR')}</td>
                  <td className="p-5 text-slate-900 font-black text-sm">{formatCurrency(invoice.amount)}</td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusColor(invoice.status)}`}>
                      {getStatusIcon(invoice.status)}
                      {invoice.status}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    {invoice.invoiceUrl || invoice.bankSlipUrl ? (
                      <a
                        href={invoice.invoiceUrl || invoice.bankSlipUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-200"
                        title="Abrir boleto"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    ) : (
                      <button disabled className="inline-flex p-2.5 text-slate-200 rounded-xl border border-transparent cursor-default">
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-5 border-t border-slate-100 flex items-center justify-between bg-slate-50/30">
          <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{invoices.length} de {pagination?.total || 0}</div>
          <div className="flex items-center gap-1.5">
            <button disabled={page === 0 || loading} onClick={() => setPage(p => p - 1)}
              className="p-2.5 bg-white text-slate-400 rounded-xl disabled:opacity-30 hover:text-slate-900 transition-all cursor-pointer border border-slate-200">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 mx-2">
              {getPageNumbers().map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-xs font-black transition-all cursor-pointer border ${page === p ? 'bg-primary text-white border-primary shadow-xl shadow-primary/20' : 'text-slate-400 border-slate-200 hover:bg-slate-100'}`}>
                  {p + 1}
                </button>
              ))}
            </div>
            <button disabled={!pagination?.total || (page + 1) * LIMIT >= pagination.total || loading} onClick={() => setPage(p => p + 1)}
              className="p-2.5 bg-white text-slate-400 rounded-xl disabled:opacity-30 hover:text-slate-900 transition-all cursor-pointer border border-slate-200">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
      </>
      )}

      <UserDetailModal
        userId={detailUser?.id || null}
        userName={detailUser?.name}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
