'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];
const MONTHS_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const pad = (n: number) => String(n).padStart(2, '0');
const toISO = (y: number, mo: number, d: number) => `${y}-${pad(mo + 1)}-${pad(d)}`;
const lastDayOf = (y: number, mo: number) => new Date(y, mo + 1, 0).getDate();
const parseISO = (v: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v || '');
  return m ? { y: +m[1], mo: +m[2] - 1, d: +m[3] } : null;
};

// Custom date dropdown styled to match the app's other dropdowns — a white
// rounded-xl shadow-2xl card with primary-accented selection. Value is the ISO
// `YYYY-MM-DD` string the backend expects.
//   mode="day"   → full calendar, display DD/MM/YYYY
//   mode="month" → month + year selector only. `align="end"` resolves a picked
//                  month to its last day (use for an end-of-range field).
export default function DatePicker({
  value,
  onChange,
  placeholder = 'Selecionar',
  min,
  max,
  mode = 'day',
  align = 'start',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  mode?: 'day' | 'month';
  align?: 'start' | 'end';
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const today = useMemo(() => {
    const d = new Date();
    return { y: d.getFullYear(), mo: d.getMonth(), d: d.getDate() };
  }, []);
  const sel = parseISO(value);
  const [view, setView] = useState(() => (sel ? { y: sel.y, mo: sel.mo } : { y: today.y, mo: today.mo }));
  const [viewYear, setViewYear] = useState(() => (sel ? sel.y : today.y));

  // Re-center on the selected value whenever the popover opens.
  useEffect(() => {
    if (!open) return;
    if (sel) { setView({ y: sel.y, mo: sel.mo }); setViewYear(sel.y); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const display = sel
    ? mode === 'month'
      ? `${MONTHS_ABBR[sel.mo]}/${sel.y}`
      : `${pad(sel.d)}/${pad(sel.mo + 1)}/${sel.y}`
    : '';

  const pickMonth = (mo: number) => {
    const day = align === 'end' ? lastDayOf(viewYear, mo) : 1;
    onChange(toISO(viewYear, mo, day));
    setOpen(false);
  };

  const monthDisabled = (mo: number) => {
    const first = toISO(viewYear, mo, 1);
    const last = toISO(viewYear, mo, lastDayOf(viewYear, mo));
    return (min != null && last < min) || (max != null && first > max);
  };

  // ── day-mode grid data ──
  const firstWeekday = new Date(view.y, view.mo, 1).getDay();
  const daysInMonth = lastDayOf(view.y, view.mo);
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const prevMonth = () => setView((v) => (v.mo === 0 ? { y: v.y - 1, mo: 11 } : { y: v.y, mo: v.mo - 1 }));
  const nextMonth = () => setView((v) => (v.mo === 11 ? { y: v.y + 1, mo: 0 } : { y: v.y, mo: v.mo + 1 }));
  const dayDisabled = (d: number) => {
    const iso = toISO(view.y, view.mo, d);
    return (min != null && iso < min) || (max != null && iso > max);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer text-xs"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className={`truncate font-bold ${value ? 'text-slate-900' : 'text-slate-400'}`}>
            {display || placeholder}
          </span>
        </div>
        <ChevronDown className={`w-3 h-3 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="absolute z-50 top-full left-0 mt-1 w-64 max-w-[calc(100vw-3rem)] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden p-3"
          >
            {mode === 'month' ? (
              <>
                {/* Year navigation */}
                <div className="flex items-center justify-between mb-3">
                  <button type="button" onClick={() => setViewYear((y) => y - 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-black text-slate-900">{viewYear}</span>
                  <button type="button" onClick={() => setViewYear((y) => y + 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Month grid */}
                <div className="grid grid-cols-3 gap-1.5">
                  {MONTHS_ABBR.map((m, i) => {
                    const isSel = !!sel && sel.y === viewYear && sel.mo === i;
                    const isCurrent = today.y === viewYear && today.mo === i;
                    const disabled = monthDisabled(i);
                    return (
                      <button key={i} type="button" disabled={disabled} onClick={() => pickMonth(i)}
                        className={`py-2.5 rounded-lg text-xs font-bold transition-colors ${
                          isSel
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : disabled
                            ? 'text-slate-200 cursor-default'
                            : isCurrent
                            ? 'text-primary bg-primary/5 hover:bg-primary/10 cursor-pointer'
                            : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                        }`}>
                        {m}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                {/* Month navigation */}
                <div className="flex items-center justify-between mb-2">
                  <button type="button" onClick={prevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-black text-slate-900">{MONTHS[view.mo]} {view.y}</span>
                  <button type="button" onClick={nextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                {/* Weekday header */}
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {WEEKDAYS.map((w, i) => (
                    <div key={i} className="text-center text-[9px] font-black text-slate-300 uppercase py-1">{w}</div>
                  ))}
                </div>
                {/* Day grid */}
                <div className="grid grid-cols-7 gap-0.5">
                  {cells.map((d, i) => {
                    if (d == null) return <div key={i} />;
                    const isSel = !!sel && sel.y === view.y && sel.mo === view.mo && sel.d === d;
                    const isToday = today.y === view.y && today.mo === view.mo && today.d === d;
                    const disabled = dayDisabled(d);
                    return (
                      <button key={i} type="button" disabled={disabled}
                        onClick={() => { onChange(toISO(view.y, view.mo, d)); setOpen(false); }}
                        className={`h-8 rounded-lg text-xs font-bold transition-colors ${
                          isSel
                            ? 'bg-primary text-white shadow-sm shadow-primary/20'
                            : disabled
                            ? 'text-slate-200 cursor-default'
                            : isToday
                            ? 'text-primary bg-primary/5 hover:bg-primary/10 cursor-pointer'
                            : 'text-slate-600 hover:bg-slate-50 cursor-pointer'
                        }`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
