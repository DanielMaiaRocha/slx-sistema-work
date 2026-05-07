'use client';

import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Calendar, 
  MapPin, 
  User, 
  ArrowRight,
  FileText,
  Clock,
  ChevronRight,
  MoreVertical,
  Download,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function InspectionsPage() {
  const [inspections, setInspections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi('/inspections/all');
        setInspections(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = inspections.filter(ins => 
    ins.propertyAddress.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">Vistorias de Imóveis</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Gerencie e gere laudos profissionais de vistoria.</p>
        </div>
        <Link 
          href="/dashboard/inspections/new"
          className="yellow-button px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-95 flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Plus className="w-4 h-4" />
          Nova Vistoria
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Buscar por endereço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-12 pr-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all shadow-sm"
          />
        </div>
        <button className="w-full md:w-auto px-6 py-3.5 bg-white border border-slate-200 rounded-xl text-slate-600 text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm">
          <Filter className="w-4 h-4 text-slate-400" />
          Filtros
        </button>
      </div>

      {/* Inspections Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-64 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-20 text-center space-y-6 rounded-3xl border border-dashed border-slate-200 shadow-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto border border-primary/20 shadow-inner">
            <ClipboardCheck className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-900">Nenhuma vistoria encontrada</h3>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">Comece criando sua primeira vistoria de imóvel agora mesmo.</p>
          </div>
          <Link 
            href="/dashboard/inspections/new"
            className="inline-block text-primary font-black uppercase tracking-[0.2em] text-[10px] hover:text-black transition-colors"
          >
            Clique aqui para começar
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((ins, i) => (
            <motion.div 
              key={ins.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card group hover:border-primary/30 transition-all flex flex-col h-full bg-white border-slate-200 shadow-sm"
            >
              <div className="p-6 space-y-4 flex-1">
                <div className="flex items-start justify-between">
                  <div className="p-3.5 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm group-hover:bg-primary group-hover:text-black transition-all duration-300">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                    ins.status === 'FINALIZED' ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                  )}>
                    {ins.status === 'FINALIZED' ? 'Finalizado' : 'Rascunho'}
                  </span>
                </div>

                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                    {ins.propertyAddress}
                  </h3>
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{format(new Date(ins.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
                  </div>
                </div>

                <div className="pt-4 grid grid-cols-2 gap-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Vistoriador</span>
                    <p className="text-xs text-slate-600 font-bold truncate">{ins.user?.name || 'Sistema'}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tipo</span>
                    <p className="text-xs text-slate-600 font-bold">{ins.propertyType || 'Residencial'}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 bg-slate-50 mt-auto flex items-center justify-between rounded-b-3xl border-t border-slate-100">
                <Link 
                  href={`/dashboard/inspections/${ins.id}`}
                  className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-[0.2em] hover:text-black transition-all"
                >
                  Ver Laudo
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="flex items-center gap-2">
                  <button className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-white rounded-xl transition-all shadow-sm">
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
