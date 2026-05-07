'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { FileText, Search, Download, Trash2, Eye, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchApi('/documents/all')
      .then(setDocuments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.user?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Documentos</h1>
          <p className="text-slate-500 text-sm">Acesse e gerencie seus contratos e arquivos.</p>
        </div>
        <button className="yellow-button px-6 py-3 rounded-xl flex items-center gap-2 shadow-xl shadow-primary/20 cursor-pointer">
          <Plus className="w-5 h-5" />
          Enviar Documento
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Buscar por nome do arquivo ou usuário..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all text-sm shadow-sm"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-44 bg-slate-50 border border-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-20 text-center bg-slate-50 rounded-3xl border border-dashed border-slate-200">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum documento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc, i) => (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-6 group hover:border-primary/30 transition-all bg-white border-slate-200 shadow-sm"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="bg-primary/10 p-3.5 rounded-2xl text-primary border border-primary/20 shadow-sm group-hover:bg-primary group-hover:text-black transition-all duration-300">
                  <FileText className="w-7 h-7" />
                </div>
                <div className="flex items-center gap-1">
                  <a 
                    href={doc.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    title="Visualizar" 
                    className="p-2.5 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all"
                  >
                    <Eye className="w-4 h-4" />
                  </a>
                  <button title="Excluir" className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="space-y-1">
                <h3 className="text-slate-900 font-bold text-sm truncate leading-tight group-hover:text-primary transition-colors" title={doc.name}>
                  {doc.name}
                </h3>
                {doc.user && (
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{doc.user.name}</p>
                )}
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {new Date(doc.createdAt).toLocaleDateString('pt-BR')} • {doc.type || 'DOCUMENTO'}
                </span>
                <a 
                  href={doc.url}
                  download
                  className="text-primary hover:text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Baixar
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
