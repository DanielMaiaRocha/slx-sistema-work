'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { FileText, Search, Download, Trash2, Eye, Plus, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await fetchApi('/documents/all');
      setDocuments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await fetchApi(`/documents/${id}`, { method: 'DELETE' });
      setDocuments(prev => prev.filter(doc => doc.id !== id));
      toast.success('Documento excluído com sucesso!');
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const filteredDocs = documents.filter(doc => 
    doc.name.toLowerCase().includes(search.toLowerCase()) ||
    doc.user?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full py-4 sm:py-8 space-y-5 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Documentos</h1>
          <p className="text-slate-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.15em]">Contratos e arquivos</p>
        </div>
        <button className="yellow-button w-full sm:w-auto px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-xl shadow-primary/20 cursor-pointer text-[10px] font-black uppercase tracking-widest">
          <Plus className="w-4 h-4" />
          Enviar Documento
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
        <input 
          type="text" 
          placeholder="Buscar por nome ou usuário..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:outline-none focus:border-primary/50 transition-all text-sm shadow-sm placeholder:text-slate-300"
        />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredDocs.map((doc, i) => (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: i * 0.05 }}
              className={`glass-card p-4 sm:p-6 group hover:border-primary/30 transition-all bg-white border-slate-200 shadow-sm ${deletingId === doc.id ? 'opacity-50 pointer-events-none' : ''}`}
            >
              <div className="flex items-start justify-between mb-4 sm:mb-6">
                <div className="bg-primary/10 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl text-primary border border-primary/20 shadow-sm group-hover:bg-primary group-hover:text-black transition-all duration-300">
                  <FileText className="w-5 h-5 sm:w-7 sm:h-7" />
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
                  <button 
                    title="Excluir" 
                    onClick={() => setConfirmDelete({ id: doc.id, name: doc.name })}
                    className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                  >
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

              <div className="flex items-center justify-between mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-50">
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

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {confirmDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 space-y-6"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
                  <AlertTriangle className="w-7 h-7 text-rose-500" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Excluir Documento</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Tem certeza que deseja excluir <strong className="text-slate-900">"{confirmDelete.name}"</strong>?
                  </p>
                  <p className="text-xs text-rose-400 mt-2 font-bold">Esta ação não pode ser desfeita.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmDelete(null)}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleDelete(confirmDelete.id)}
                  disabled={!!deletingId}
                  className="flex-1 py-3.5 bg-rose-500 text-white rounded-2xl font-bold text-sm hover:bg-rose-600 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  {deletingId ? 'Excluindo...' : 'Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
