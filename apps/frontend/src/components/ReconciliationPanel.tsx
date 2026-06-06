'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, ChevronDown, Check, FileSpreadsheet, FileText, TrendingUp, TrendingDown,
  Wallet, Receipt, ArrowDownLeft, ArrowUpRight, Loader2, RefreshCw,
} from 'lucide-react';
import Cookies from 'js-cookie';
import { fetchApi } from '@/lib/api';
import { useBranding } from '@/components/BrandingProvider';
import DatePicker from '@/components/DatePicker';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://slx-sistema-work-production.up.railway.app/api';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const compactCurrency = (value: number) => {
  const abs = Math.abs(value || 0);
  if (abs >= 1000) return `R$ ${(value / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k`;
  return formatCurrency(value);
};

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

interface ReconciliationReport {
  period: { startDate: string | null; finishDate: string; label: string };
  totals: { received: number; totalIn: number; totalOut: number; net: number; feesTotal: number; transactionCount: number };
  currentBalance: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  byType: { type: string; label: string; count: number; total: number; direction: 'in' | 'out' }[];
  fees: { type: string; label: string; count: number; total: number }[];
  series: { bucket: string; label: string; in: number; out: number; net: number }[];
  granularity: 'day' | 'month';
}

const periodOptions = [
  { label: 'Mês', value: 'month' },
  { label: 'Período', value: 'custom' },
  { label: 'Desde o início', value: 'all' },
];

export default function ReconciliationPanel() {
  const { branding } = useBranding();
  const primary = branding?.primaryColor || '#6D28D9';
  const todayISO = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);
  const monthRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState({
    periodType: 'month',
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
    startDate: '',
    endDate: '',
  });

  // Build the reconciliation query string the backend's resolvePeriod expects:
  // ?all=true | ?startDate&endDate | ?month&year.
  const buildQuery = useCallback(() => {
    if (filters.periodType === 'all') return 'all=true';
    if (filters.periodType === 'custom') {
      if (!filters.startDate || !filters.endDate) return null;
      return `startDate=${filters.startDate}&endDate=${filters.endDate}`;
    }
    return `month=${filters.month}&year=${filters.year}`;
  }, [filters]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (periodRef.current && !periodRef.current.contains(event.target as Node)) setIsPeriodOpen(false);
      if (monthRef.current && !monthRef.current.contains(event.target as Node)) setIsMonthOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const query = buildQuery();
    if (!query) return; // custom range not fully filled yet
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setHoveredIdx(null);
      try {
        const data = await fetchApi(`/financial/reconciliation?${query}`);
        if (!cancelled) setReport(data);
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Falha ao carregar a conciliação.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [buildQuery]);

  const handleExport = async (kind: 'pdf' | 'excel') => {
    const query = buildQuery();
    if (!query) return;
    setExporting(kind);
    try {
      const token = Cookies.get('token');
      const res = await fetch(`${API_URL}/financial/reconciliation/${kind}?${query}`, {
        headers: {
          'x-tenant-slug': 'slx',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(`Falha ao exportar (${res.status})`);
      const blob = await res.blob();
      // Build the download name client-side: the Content-Disposition header
      // isn't exposed to JS across origins (CORS), so relying on it gives the
      // generic fallback. The loaded report's period label is the source here.
      const label = report?.period?.label || 'periodo';
      const safeLabel = label.replace(/[\/\\:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim();
      const filename = `conciliacao - ${safeLabel}.${kind === 'pdf' ? 'pdf' : 'xlsx'}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Falha ao exportar.');
    } finally {
      setExporting(null);
    }
  };

  const setFilter = (name: string, value: any) => setFilters((prev) => ({ ...prev, [name]: value }));

  const maxBar = report ? Math.max(1, ...report.series.map((s) => Math.max(s.in, s.out))) : 1;
  const exportDisabled = loading || !report || report.totals.transactionCount === 0;

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Controls */}
      <div className="glass-card p-4 sm:p-6 bg-white border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-end gap-3">
          {/* Period type */}
          <div className="relative flex-1 min-w-0" ref={periodRef}>
            <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Período</label>
            <button
              onClick={() => setIsPeriodOpen(!isPeriodOpen)}
              className="mt-1 w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer text-xs"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-slate-900 font-bold truncate">
                  {periodOptions.find((o) => o.value === filters.periodType)?.label}
                </span>
              </div>
              <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
              {isPeriodOpen && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                  {periodOptions.map((opt) => (
                    <button key={opt.value} onClick={() => { setFilter('periodType', opt.value); setIsPeriodOpen(false); }}
                      className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${filters.periodType === opt.value ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'}`}>
                      {opt.label}
                      {filters.periodType === opt.value && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Month + year */}
          {filters.periodType === 'month' && (
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <div className="relative flex-1 min-w-0" ref={monthRef}>
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mês</label>
                <button onClick={() => setIsMonthOpen(!isMonthOpen)}
                  className="mt-1 w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 text-xs font-bold text-slate-900 flex items-center justify-between cursor-pointer hover:border-primary/30 transition-all">
                  <span>{months[filters.month]}</span>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isMonthOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isMonthOpen && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                      className="absolute z-50 top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden">
                      {months.map((m, i) => (
                        <button key={i} onClick={() => { setFilter('month', i); setIsMonthOpen(false); }}
                          className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${filters.month === i ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'}`}>
                          {m} {filters.month === i && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div className="flex-1 min-w-0 sm:max-w-[120px]">
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ano</label>
                <input type="number" value={filters.year} onChange={(e) => setFilter('year', parseInt(e.target.value))}
                  className="mt-1 w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 text-xs font-bold text-slate-900 outline-none hover:border-primary/30 focus:border-primary/50 focus:bg-white transition-all" />
              </div>
            </div>
          )}

          {/* Custom range */}
          {filters.periodType === 'custom' && (
            <div className="grid grid-cols-2 gap-2 sm:contents">
              <div className="flex-1 min-w-0">
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mês inicial</label>
                <div className="mt-1">
                  <DatePicker mode="month" align="start" value={filters.startDate} onChange={(v) => setFilter('startDate', v)} max={filters.endDate || todayISO} placeholder="Mês/Ano" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <label className="text-[8px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mês final</label>
                <div className="mt-1">
                  <DatePicker mode="month" align="end" value={filters.endDate} onChange={(v) => setFilter('endDate', v)} min={filters.startDate || undefined} max={todayISO} placeholder="Mês/Ano" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 pt-1">
          <button onClick={() => handleExport('excel')} disabled={exportDisabled || exporting !== null}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-40 disabled:cursor-default cursor-pointer">
            {exporting === 'excel' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
            Excel
          </button>
          <button onClick={() => handleExport('pdf')} disabled={exportDisabled || exporting !== null}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 transition-all disabled:opacity-40 disabled:cursor-default cursor-pointer">
            {exporting === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
            PDF
          </button>
          {report && (
            <span className="ml-auto hidden sm:inline text-[10px] font-black uppercase tracking-[0.15em] text-slate-400">
              {report.period.label}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="glass-card p-4 bg-rose-50 border-rose-200 text-rose-600 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setFilters((p) => ({ ...p }))} className="inline-flex items-center gap-1 text-rose-700 hover:underline cursor-pointer">
            <RefreshCw className="w-3 h-3" /> Tentar de novo
          </button>
        </div>
      )}

      {loading ? (
        <div className="glass-card p-16 text-center bg-white border-slate-200 shadow-sm">
          <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-3">Conciliando extrato Asaas...</p>
        </div>
      ) : !report ? null : report.totals.transactionCount === 0 ? (
        <div className="glass-card p-16 text-center text-slate-400 text-sm italic bg-white border-slate-200 shadow-sm">
          Nenhuma movimentação encontrada no período.
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="Total Recebido" value={formatCurrency(report.totals.received)} icon={<ArrowDownLeft className="w-4 h-4" />} tone="emerald" accent={primary} />
            <SummaryCard label="Entradas" value={formatCurrency(report.totals.totalIn)} icon={<TrendingUp className="w-4 h-4" />} tone="emerald" accent={primary} />
            <SummaryCard label="Saídas" value={formatCurrency(report.totals.totalOut)} icon={<TrendingDown className="w-4 h-4" />} tone="rose" accent={primary} />
            <SummaryCard label="Em Caixa (líquido)" value={formatCurrency(report.totals.net)} icon={<Wallet className="w-4 h-4" />} tone="primary" accent={primary} />
            <SummaryCard label="Total de Taxas" value={formatCurrency(report.totals.feesTotal)} icon={<Receipt className="w-4 h-4" />} tone="rose" accent={primary} />
            <SummaryCard label="Transações" value={String(report.totals.transactionCount)} icon={<ArrowUpRight className="w-4 h-4" />} tone="slate" accent={primary} />
            <SummaryCard label="Saldo no Fim" value={report.closingBalance != null ? formatCurrency(report.closingBalance) : '—'} icon={<Wallet className="w-4 h-4" />} tone="slate" accent={primary} />
            <SummaryCard label="Saldo Atual" value={report.currentBalance != null ? formatCurrency(report.currentBalance) : '—'} icon={<Wallet className="w-4 h-4" />} tone="slate" accent={primary} />
          </div>

          {/* Hot graphic: flow chart with live hover readout */}
          {(() => {
            const active = hoveredIdx != null && report.series[hoveredIdx] ? report.series[hoveredIdx] : null;
            return (
              <div className="glass-card p-5 sm:p-6 bg-white border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                      Fluxo por {report.granularity === 'day' ? 'Dia' : 'Mês'}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.15em] mt-0.5">
                      {active ? `Período · ${active.label}` : 'Passe o mouse nas barras'}
                    </p>
                  </div>
                  {/* Live readout — updates as you hover a bar (sits outside the
                      scroll area so it never gets clipped). Falls back to legend. */}
                  {active ? (
                    <motion.div key={active.bucket} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between sm:justify-end gap-2 sm:gap-5 w-full sm:w-auto rounded-xl bg-slate-50 sm:bg-transparent px-3 py-2 sm:p-0">
                      <ChartStat label="Entradas" value={formatCurrency(active.in)} className="text-emerald-600" />
                      <ChartStat label="Saídas" value={formatCurrency(active.out)} className="text-rose-600" />
                      <ChartStat label="Líquido" value={formatCurrency(active.net)} className={active.net >= 0 ? 'text-emerald-600' : 'text-rose-600'} />
                    </motion.div>
                  ) : (
                    <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /> Entradas</span>
                      <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500" /> Saídas</span>
                    </div>
                  )}
                </div>
                <div className="flex items-end gap-1.5 sm:gap-3 h-52 overflow-x-auto pb-1" onMouseLeave={() => setHoveredIdx(null)}>
                  {report.series.map((s, i) => {
                    const inH = Math.max(s.in > 0 ? 4 : 0, Math.round((s.in / maxBar) * 100));
                    const outH = Math.max(s.out > 0 ? 4 : 0, Math.round((s.out / maxBar) * 100));
                    const isActive = hoveredIdx === i;
                    const dimmed = hoveredIdx != null && !isActive;
                    return (
                      <div
                        key={s.bucket}
                        onMouseEnter={() => setHoveredIdx(i)}
                        onClick={() => setHoveredIdx((prev) => (prev === i ? null : i))}
                        className={`flex-1 min-w-[28px] h-full flex flex-col items-center justify-end cursor-pointer rounded-lg transition-colors ${isActive ? 'bg-slate-50' : ''}`}
                      >
                        <div className="relative flex items-end justify-center gap-1 w-full h-full pt-6">
                          {/* value-on-bar for the active column (kept inside the
                              container's empty top area, so no clipping) */}
                          {isActive && (
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                              className="absolute top-0 left-1/2 -translate-x-1/2 z-10 whitespace-nowrap bg-slate-900 text-white text-[9px] font-black rounded-md px-2 py-1 shadow-lg">
                              {compactCurrency(s.net)}
                              <span className={`ml-1 ${s.net >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{s.net >= 0 ? '▲' : '▼'}</span>
                            </motion.div>
                          )}
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: `${inH}%` }} transition={{ delay: i * 0.03, type: 'spring', stiffness: 120, damping: 18 }}
                            className={`w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/30 transition-opacity ${dimmed ? 'opacity-30' : 'opacity-100'}`}
                          />
                          <motion.div
                            initial={{ height: 0 }} animate={{ height: `${outH}%` }} transition={{ delay: i * 0.03 + 0.05, type: 'spring', stiffness: 120, damping: 18 }}
                            className={`w-2.5 sm:w-3.5 rounded-t-md bg-gradient-to-t from-rose-500 to-rose-400 shadow-sm shadow-rose-500/30 transition-opacity ${dimmed ? 'opacity-30' : 'opacity-100'}`}
                          />
                        </div>
                        <span className={`text-[8px] sm:text-[9px] font-bold mt-2 whitespace-nowrap transition-colors ${isActive ? 'text-slate-900' : 'text-slate-400'}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Tables: fees + by type */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <BreakdownTable
              title="Taxas Cobradas"
              empty="Nenhuma taxa no período"
              rows={report.fees.map((f) => ({ label: f.label, count: f.count, value: -f.total }))}
            />
            <BreakdownTable
              title="Movimentações por Tipo"
              empty="Sem movimentações"
              rows={report.byType.map((b) => ({ label: b.label, count: b.count, value: b.total }))}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ChartStat({ label, value, className }: { label: string; value: string; className: string }) {
  return (
    <div className="text-right">
      <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-slate-400">{label}</p>
      <p className={`text-xs sm:text-sm font-black tabular-nums ${className}`}>{value}</p>
    </div>
  );
}

function SummaryCard({ label, value, icon, tone, accent }: { label: string; value: string; icon: React.ReactNode; tone: 'emerald' | 'rose' | 'primary' | 'slate'; accent: string }) {
  const toneClasses: Record<string, string> = {
    emerald: 'text-emerald-600',
    rose: 'text-rose-600',
    primary: '',
    slate: 'text-slate-900',
  };
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3 sm:p-4 bg-white border-slate-200 shadow-sm">
      <div className="flex items-center justify-between gap-1">
        <span className="text-[8px] font-black uppercase tracking-[0.12em] text-slate-400 leading-tight">{label}</span>
        <span className={`shrink-0 ${tone === 'primary' ? '' : toneClasses[tone]}`} style={tone === 'primary' ? { color: accent } : undefined}>{icon}</span>
      </div>
      <p className={`text-[13px] sm:text-lg font-black mt-1.5 sm:mt-2 tabular-nums leading-tight break-words ${toneClasses[tone]}`} style={tone === 'primary' ? { color: accent } : undefined}>
        {value}
      </p>
    </motion.div>
  );
}

function BreakdownTable({ title, rows, empty }: { title: string; rows: { label: string; count: number; value: number }[]; empty: string }) {
  return (
    <div className="glass-card overflow-hidden bg-white border-slate-200 shadow-sm rounded-2xl">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100">
        <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="overflow-x-auto max-h-80 overflow-y-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-white">
            <tr className="border-b border-slate-100">
              <th className="px-4 sm:px-5 py-2.5 text-slate-400 font-black text-[9px] uppercase tracking-widest">Tipo</th>
              <th className="px-2 sm:px-3 py-2.5 text-slate-400 font-black text-[9px] uppercase tracking-widest text-center">Qtd.</th>
              <th className="px-4 sm:px-5 py-2.5 text-slate-400 font-black text-[9px] uppercase tracking-widest text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.length === 0 ? (
              <tr><td colSpan={3} className="px-4 sm:px-5 py-8 text-center text-slate-400 text-xs italic">{empty}</td></tr>
            ) : rows.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 sm:px-5 py-3 text-slate-700 text-[11px] sm:text-xs font-bold">{r.label}</td>
                <td className="px-2 sm:px-3 py-3 text-slate-500 text-[11px] sm:text-xs font-bold text-center">{r.count}</td>
                <td className={`px-4 sm:px-5 py-3 text-[11px] sm:text-xs font-black text-right tabular-nums whitespace-nowrap ${r.value >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {formatCurrency(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
