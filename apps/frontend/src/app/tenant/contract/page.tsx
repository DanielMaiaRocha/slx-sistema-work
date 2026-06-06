'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { 
  FileText, 
  Download, 
  ExternalLink,
  Calendar,
  Home,
  DollarSign,
  ShieldCheck,
  FileSearch
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { cn, getAssetUrl } from '@/lib/utils';

export default function TenantContract() {
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContracts() {
      try {
        const data = await fetchApi('/tenant/contract');
        setContracts(data);
      } catch (error: any) {
        toast.error('Erro ao carregar contratos');
      } finally {
        setLoading(false);
      }
    }
    loadContracts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="h-48 bg-slate-50 border border-slate-100 rounded-[3rem] animate-pulse" />
        <div className="h-32 bg-slate-50 border border-slate-100 rounded-[2.5rem] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-24">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pt-4 text-center md:text-left items-center md:items-start">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center p-4 shadow-xl shadow-slate-200/50">
               <FileText className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-1.5">
               <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase leading-none">Meu Contrato</h1>
               <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase opacity-80">Gestão de locação e termos digitais</p>
            </div>
          </div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-slate-50/50 border-2 border-dashed border-slate-100 rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-24 text-center space-y-8">
          <div className="inline-flex p-6 sm:p-10 bg-white border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] shadow-sm mb-2 relative group transition-transform hover:scale-110">
            <div className="absolute inset-0 bg-primary/5 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <FileSearch className="w-12 h-12 sm:w-16 sm:h-16 text-slate-200 relative z-10" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tighter">Nenhum contrato digital encontrado</h3>
            <p className="text-slate-400 font-bold text-sm tracking-tight max-w-xs mx-auto">Sua imobiliária ainda não disponibilizou o contrato digital nesta área.</p>
          </div>
          <div className="pt-4">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-white px-6 py-3 rounded-full border border-slate-100 shadow-sm">
               Suporte: (21) 2234-7818
             </span>
          </div>
        </div>
      ) : (
        <div className="space-y-10">
          {contracts.map((contract) => (
            <div key={contract.id} className="bg-white border border-slate-200 rounded-[2.5rem] sm:rounded-[3.5rem] p-6 sm:p-10 space-y-8 sm:space-y-10 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500">
              <div className="flex items-center gap-4 sm:gap-6">
                 <div className="w-12 h-12 sm:w-16 sm:h-16 shrink-0 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center text-primary shadow-sm">
                    <FileText className="w-6 h-6 sm:w-8 sm:h-8" />
                 </div>
                 <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tighter leading-tight break-words">{contract.name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5 opacity-70">Documento de Locação Oficial</p>
                 </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:gap-6">
                <div className="p-5 sm:p-8 bg-slate-50 border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-4 sm:gap-6 shadow-inner">
                  <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400">
                     <Home className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Endereço do Imóvel</p>
                    <p className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight break-words">{contract.address || 'Endereço não informado'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div className="p-5 sm:p-8 bg-slate-50 border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-4 sm:gap-6 shadow-inner">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-sm text-emerald-500">
                       <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Aluguel Base</p>
                      <p className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight">
                        {contract.amount ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.amount) : 'Sob consulta'}
                      </p>
                    </div>
                  </div>
                  <div className="p-5 sm:p-8 bg-slate-50 border border-slate-100 rounded-[2rem] sm:rounded-[2.5rem] flex items-center gap-4 sm:gap-6 shadow-inner">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 shrink-0 bg-white rounded-2xl flex items-center justify-center shadow-sm text-amber-500">
                       <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Prazo Vigente</p>
                      <p className="text-base sm:text-lg font-extrabold text-slate-900 tracking-tight break-words">{contract.duration || 'Não informada'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                 <a
                  href={getAssetUrl(contract.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-600 transition-all flex items-center justify-center gap-3 shadow-sm"
                >
                    <ExternalLink className="w-5 h-5 text-slate-300" />
                    Visualizar
                 </a>
                 <a
                  href={getAssetUrl(contract.url)}
                  download={contract.name}
                  className="flex-1 py-6 yellow-button text-black rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3"
                >
                    <Download className="w-5 h-5" />
                    Baixar Contrato
                 </a>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
