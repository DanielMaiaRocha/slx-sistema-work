'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { FileText, Download, FolderOpen, Search, Filter, Clock, Files } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: string;
}

export default function LandlordDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/landlord/documents')
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="h-48 bg-slate-50 border border-slate-100 rounded-[3rem] animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-20 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24 max-w-6xl mx-auto">
      {/* Header section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center p-4 shadow-xl shadow-slate-200/50">
             <Files className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-1.5">
             <h2 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase leading-none">Documentos <span className="text-primary italic">&</span> Relatórios</h2>
             <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase opacity-80">Extratos, vistorias e informativos SLX</p>
          </div>
        </div>
      </section>

      {/* Search and filter */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
           <input 
             type="text" 
             placeholder="Buscar nos meus documentos..." 
             className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2rem] text-sm font-bold text-slate-900 focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-sm"
           />
        </div>
        <button className="flex items-center gap-3 px-10 py-5 bg-white border border-slate-200 rounded-[2rem] text-[11px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 transition-all shadow-sm">
           <Filter className="w-4.5 h-4.5" />
           Filtrar por Tipo
        </button>
      </section>

      {/* Documents List */}
      <section className="space-y-6">
        {documents.length === 0 ? (
          <div className="py-32 rounded-[4rem] bg-slate-50/50 border-2 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-6">
            <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center text-slate-200 shadow-sm">
              <FileText className="w-10 h-10" />
            </div>
            <div className="space-y-2">
              <p className="text-slate-900 font-extrabold text-2xl tracking-tighter uppercase">Nenhum documento disponível</p>
              <p className="text-slate-400 font-bold text-sm tracking-tight max-w-sm">
                Quando a imobiliária enviar relatórios ou extratos, eles aparecerão automaticamente aqui.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {documents.map((doc) => (
              <div 
                key={doc.id}
                className="group flex items-center justify-between p-7 bg-white border border-slate-200 rounded-[2.5rem] hover:border-primary hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 shadow-sm"
              >
                <div className="flex items-center gap-7">
                   <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:bg-primary/5 transition-all duration-300">
                      <FileText className="w-8 h-8" />
                   </div>
                   <div className="space-y-2">
                      <h4 className="text-lg font-extrabold text-slate-900 tracking-tighter leading-tight group-hover:text-primary transition-colors">
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-5">
                         <span className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                           <Clock className="w-3.5 h-3.5" />
                           {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                         </span>
                         <span className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-500 uppercase tracking-widest">
                           {doc.type}
                         </span>
                      </div>
                   </div>
                </div>
                <a 
                  href={doc.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-8 py-5 yellow-button text-black rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Download className="w-4.5 h-4.5" />
                  Visualizar
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
