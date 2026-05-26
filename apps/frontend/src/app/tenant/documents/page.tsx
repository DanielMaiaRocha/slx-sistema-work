'use client';

import { useEffect, useState } from 'react';
import { fetchApi } from '@/lib/api';
import { getAssetUrl } from '@/lib/utils';
import { FolderOpen, FileText, ExternalLink, Shield, Download, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Cookies from 'js-cookie';

export default function DocumentsPage() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'TENANT' | 'LANDLORD'>('TENANT');
  
  const userRole = Cookies.get('user_role') || '';
  const roles = userRole.split(',').map(r => r.trim());
  const hasTenant = roles.includes('TENANT');
  const hasLandlord = roles.includes('LANDLORD');
  const isBoth = hasTenant && hasLandlord;

  useEffect(() => {
    if (!hasTenant && hasLandlord) {
      setActiveTab('LANDLORD');
    }
    loadDocs();
  }, [hasTenant, hasLandlord]);

  const loadDocs = async () => {
    try {
      const data = await fetchApi('/documents/me');
      setDocs(data);
    } catch (err) {
      console.error('Error loading documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = docs.filter(d => 
    d.visibility === 'ALL' || d.visibility === activeTab
  );

  return (
    <div className="space-y-12 animate-in fade-in duration-700 max-w-6xl mx-auto pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4">
        <div className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center p-4 shadow-xl shadow-slate-200/50">
               <FolderOpen className="w-8 h-8 text-primary" />
            </div>
            <div>
               <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase leading-none">Meus Arquivos</h1>
               <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase mt-2 opacity-80">Gestão centralizada de documentos SLX</p>
            </div>
          </div>
        </div>

        {/* Role Tabs */}
        {isBoth && (
          <div className="flex p-1.5 bg-slate-50 border border-slate-100 rounded-2xl w-fit shadow-inner">
            <button 
              onClick={() => setActiveTab('TENANT')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                activeTab === 'TENANT' 
                  ? 'bg-primary text-black shadow-2xl shadow-primary/30' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              Inquilino
            </button>
            <button 
              onClick={() => setActiveTab('LANDLORD')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-3 ${
                activeTab === 'LANDLORD' 
                  ? 'bg-primary text-black shadow-2xl shadow-primary/30' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Shield className="w-4 h-4" />
              Proprietário
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-slate-50 border border-slate-100 rounded-[2.5rem] animate-pulse" />
          ))
        ) : filteredDocs.length === 0 ? (
          <div className="col-span-full py-32 text-center space-y-6 bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[3rem]">
            <div className="inline-flex p-8 bg-white border border-slate-100 rounded-3xl shadow-sm mb-4">
              <FileText className="w-16 h-16 text-slate-200" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tighter">Nenhum documento encontrado</h3>
              <p className="text-slate-400 font-bold text-sm tracking-tight max-w-sm mx-auto">Você ainda não possui arquivos ou contratos anexados em sua conta.</p>
            </div>
          </div>
        ) : (
          filteredDocs.map((doc, i) => (
            <motion.div 
              key={doc.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white border border-slate-200 rounded-[2.5rem] p-8 hover:border-primary hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 flex items-center justify-between shadow-sm"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:bg-primary/5 group-hover:border-primary/20 transition-all duration-300">
                  <FileText className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h4 className="text-lg font-extrabold text-slate-900 group-hover:text-primary transition-colors tracking-tighter leading-tight">{doc.name}</h4>
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href={getAssetUrl(doc.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 bg-white border border-slate-100 text-slate-400 hover:text-black hover:border-primary hover:bg-primary rounded-2xl transition-all shadow-sm flex items-center justify-center hover:scale-110 active:scale-95"
                  title="Abrir Documento"
                >
                  <ExternalLink className="w-6 h-6" />
                </a>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
