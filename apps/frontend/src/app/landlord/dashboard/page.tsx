'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { Home, MapPin, Building, ChevronRight, FileText, Calendar, CheckCircle2, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Property {
  id: string;
  address: string;
  neighborhood: string;
  city: string;
  state: string;
  type: string;
  createdAt: string;
}

export default function LandlordDashboard() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchApi('/landlord/properties'),
      fetchApi('/landlord/documents')
    ]).then(([props, docs]) => {
      setProperties(props);
      setDocuments(docs.slice(0, 4)); 
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-64 bg-slate-50 border border-slate-100 rounded-[3rem] animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 h-96 bg-slate-50 border border-slate-100 rounded-[3rem] animate-pulse" />
          <div className="h-96 bg-slate-50 border border-slate-100 rounded-[3rem] animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Welcome Section - Elegant Light Banner */}
      <section className="relative overflow-hidden p-8 md:p-14 rounded-[2.5rem] md:rounded-[3rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/40">
        <div className="absolute top-0 left-0 w-1.5 md:w-2 h-full bg-primary" />
        <div className="relative z-10 space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 md:gap-3 px-4 md:px-5 py-2 bg-slate-50 border border-slate-100 rounded-full text-primary text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">
            <TrendingUp className="w-3.5 md:w-4 h-3.5 md:w-4 h-4" />
            Visão Geral do Patrimônio
          </div>
          <div className="space-y-2 md:space-y-3">
            <h2 className="text-3xl md:text-5xl font-extrabold text-slate-900 tracking-tighter leading-tight md:leading-none">
              Gestão de <span className="text-primary">Patrimônio</span>
            </h2>
            <p className="text-slate-400 font-bold text-sm md:text-base max-w-xl leading-relaxed opacity-80">
              Acompanhe o status de todos os seus imóveis cadastrados na SLX Imobiliária em tempo real.
            </p>
          </div>
        </div>
        {/* Subtle Background Icon */}
        <div className="absolute top-0 right-0 p-6 md:p-12 opacity-[0.03] pointer-events-none">
           <Building className="w-48 md:w-64 h-48 md:h-64 text-slate-900" />
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Column: Properties */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <Home className="w-5 h-5 text-primary" />
              </div>
              Imóveis Cadastrados
            </h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-50 border border-slate-100 px-5 py-2.5 rounded-full shadow-sm">
              {properties.length} {properties.length === 1 ? 'Unidade' : 'Unidades'}
            </span>
          </div>

          {properties.length === 0 ? (
            <div className="py-24 rounded-[3.5rem] bg-slate-50/50 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
              <div className="w-20 h-20 bg-white rounded-[2rem] flex items-center justify-center text-slate-200 shadow-sm">
                <Home className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <p className="text-slate-900 font-extrabold text-xl tracking-tighter">Nenhum imóvel listado</p>
                <p className="text-slate-400 font-bold text-sm max-w-xs mx-auto tracking-tight">Seu patrimônio aparecerá aqui assim que for cadastrado pela nossa equipe.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {properties.map((property) => (
                <div 
                  key={property.id}
                  className="group relative p-6 md:p-8 rounded-[2rem] md:rounded-[3rem] bg-white border border-slate-200 hover:border-primary transition-all duration-500 shadow-sm hover:shadow-2xl hover:shadow-primary/5"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start md:items-center gap-5 md:gap-8">
                      <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 border border-slate-100 rounded-xl md:rounded-[1.5rem] flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:bg-primary/5 transition-all duration-500 shadow-sm shrink-0">
                        <Home className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                      <div className="space-y-1.5 md:space-y-2">
                        <h4 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors">
                          {property.address}
                        </h4>
                        <div className="flex items-center gap-2 text-slate-400 text-[10px] md:text-xs font-bold tracking-tight uppercase opacity-80">
                          <MapPin className="w-3 md:w-3.5 h-3 md:h-3.5" />
                          {property.neighborhood}, {property.city}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center md:flex-col md:items-end justify-between md:justify-center gap-3 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                       <div className="flex items-center gap-2 md:gap-3">
                          <span className="px-2.5 md:px-3.5 py-1 md:py-1.5 bg-slate-50 border border-slate-100 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] text-slate-400">
                            {property.type === 'RESIDENTIAL' ? 'Residencial' : 'Comercial'}
                          </span>
                          <span className="px-2.5 md:px-3.5 py-1 md:py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] text-emerald-500 shadow-sm">
                            Ativo
                          </span>
                       </div>
                       <button className="w-9 h-9 md:w-10 md:h-10 bg-white border border-slate-200 rounded-lg md:rounded-xl flex items-center justify-center text-slate-300 group-hover:bg-primary group-hover:border-primary group-hover:text-black transition-all shadow-sm">
                         <ChevronRight className="w-5 h-5" />
                       </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Latest Documents */}
        <div className="space-y-8">
          <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
               <FileText className="w-5 h-5 text-primary" />
            </div>
            Arquivos Recentes
          </h3>

          <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
             <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestão Documental</p>
             </div>
             
             <div className="divide-y divide-slate-50">
                {documents.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                       <FileText className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum arquivo</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <a 
                      key={doc.id}
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-5 p-7 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-primary transition-all">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 overflow-hidden">
                        <h4 className="text-slate-900 font-extrabold uppercase tracking-tight text-[11px] group-hover:text-primary transition-colors truncate">
                          {doc.name}
                        </h4>
                        <p className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                          {format(new Date(doc.createdAt), "dd MMM yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </a>
                  ))
                )}
             </div>
             
             {documents.length > 0 && (
               <div className="p-8 bg-slate-50/30">
                  <a href="/landlord/documents" className="block text-center py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all shadow-sm">
                    Ver Todos os Arquivos
                  </a>
               </div>
             )}
          </div>
        </div>
      </div>

      {/* Info Cards - Modern Layout */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="p-10 rounded-[3rem] bg-white border border-slate-200 space-y-6 shadow-sm hover:shadow-xl transition-all group">
           <div className="w-14 h-14 bg-blue-50 border border-blue-100 rounded-[1.5rem] flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
             <FileText className="w-7 h-7" />
           </div>
           <div className="space-y-2">
             <h4 className="text-slate-900 font-extrabold text-base tracking-tight">Contratos Ativos</h4>
             <p className="text-slate-400 font-bold text-xs leading-relaxed">Todos os seus imóveis estão com contratos vigentes e regularizados.</p>
           </div>
        </div>
        <div className="p-10 rounded-[3rem] bg-white border border-slate-200 space-y-6 shadow-sm hover:shadow-xl transition-all group">
           <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-[1.5rem] flex items-center justify-center text-amber-500 shadow-sm group-hover:scale-110 transition-transform">
             <Calendar className="w-7 h-7" />
           </div>
           <div className="space-y-2">
             <h4 className="text-slate-900 font-extrabold text-base tracking-tight">Próximos Reajustes</h4>
             <p className="text-slate-400 font-bold text-xs leading-relaxed">Nenhum reajuste programado para o seu portfólio nos próximos 30 dias.</p>
           </div>
        </div>
        <div className="p-10 rounded-[3rem] bg-white border border-slate-200 space-y-6 shadow-sm hover:shadow-xl transition-all group">
           <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-[1.5rem] flex items-center justify-center text-emerald-500 shadow-sm group-hover:scale-110 transition-transform">
             <Building className="w-7 h-7" />
           </div>
           <div className="space-y-2">
             <h4 className="text-slate-900 font-extrabold text-base tracking-tight">Vistorias Técnicas</h4>
             <p className="text-slate-400 font-bold text-xs leading-relaxed">Acesse os laudos de vistoria técnica e termos de entrega na aba de documentos.</p>
           </div>
        </div>
      </section>
    </div>
  );
}
