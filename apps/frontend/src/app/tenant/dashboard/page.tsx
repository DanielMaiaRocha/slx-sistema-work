'use client';

import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { 
  CreditCard, 
  Copy, 
  ExternalLink, 
  Download, 
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, getAssetUrl } from '@/lib/utils';

export default function TenantDashboard() {
  const [bills, setBills] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [billsData, docsData] = await Promise.all([
          fetchApi('/tenant/bills'),
          fetchApi('/documents/me') 
        ]);
        setBills(billsData);
        setDocuments(docsData.slice(0, 4));
      } catch (error: any) {
        toast.error('Erro ao carregar dados');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Código de barras copiado!');
  };

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    return new Date(`${dateStr.split('T')[0]}T12:00:00`);
  };

  const nextDueDate = bills
    .filter(b => b.status !== 'PAGO')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0]?.dueDate;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="hidden md:grid grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Stat Cards - Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-8">
         <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 flex md:flex-col items-center md:items-start gap-4 md:gap-5 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-amber-50 rounded-xl md:rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shrink-0">
               <Clock className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
               <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Contas Pendentes</p>
               <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter mt-0.5 md:mt-1">
                 {bills.filter(b => b.status !== 'PAGO').length} Boletos
               </h3>
            </div>
         </div>
         <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 flex md:flex-col items-center md:items-start gap-4 md:gap-5 shadow-sm hover:shadow-md transition-all">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-emerald-50 rounded-xl md:rounded-2xl flex items-center justify-center text-emerald-500 border border-emerald-100 shrink-0">
               <CheckCircle2 className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
               <p className="text-slate-400 text-[8px] md:text-[10px] font-black uppercase tracking-widest">Histórico Pago</p>
               <h3 className="text-lg md:text-2xl font-black text-slate-900 tracking-tighter mt-0.5 md:mt-1">
                 {bills.filter(b => b.status === 'PAGO').length} Mensalidades
               </h3>
            </div>
         </div>
         <div className="bg-white border border-slate-200 rounded-[1.5rem] md:rounded-[2rem] p-5 md:p-8 flex md:flex-col items-center md:items-start gap-4 md:gap-5 shadow-sm hover:shadow-md transition-all sm:col-span-2 md:col-span-1">
            <div className="w-10 h-10 md:w-14 md:h-14 bg-primary/10 rounded-xl md:rounded-2xl flex items-center justify-center text-primary border border-primary/20 shrink-0">
               <CreditCard className="w-5 h-5 md:w-7 md:h-7" />
            </div>
            <div>
               <p className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]">Próximo Vencimento</p>
               <h3 className="text-lg md:text-2xl font-extrabold text-slate-900 tracking-tighter mt-0.5 md:mt-1">
                 {nextDueDate ? `Dia ${format(parseLocalDate(nextDueDate), "dd/MM")}` : 'Sem pendências'}
               </h3>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-extrabold text-slate-900 uppercase tracking-tight flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
                 <CreditCard className="w-5 h-5 text-primary" />
              </div>
              Meus Boletos
            </h3>
          </div>

          <div className="space-y-6 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-2 gap-8">
            {bills.length === 0 ? (
              <div className="md:col-span-full bg-slate-50 border border-slate-100 rounded-[2.5rem] sm:rounded-[3rem] p-10 sm:p-24 text-center space-y-6">
                <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white rounded-3xl flex items-center justify-center text-slate-200 mx-auto shadow-sm">
                  <CreditCard className="w-10 h-10 sm:w-12 sm:h-12" />
                </div>
                <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-xs italic">Nenhum boleto encontrado em sua conta.</p>
              </div>
            ) : (
              bills.map((bill) => (
                <div key={bill.id} className="bg-white border border-slate-200 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden group hover:border-primary transition-all duration-500 shadow-sm hover:shadow-xl hover:shadow-primary/5">
                  <div className="p-6 md:p-8 space-y-6 md:space-y-8">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 md:space-y-3">
                        <div className="flex flex-wrap items-center gap-2 md:gap-3">
                           <span className={cn(
                             "px-2.5 md:px-3.5 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[8px] md:text-[9px] font-bold uppercase tracking-[0.1em] border shadow-sm",
                             bill.status === 'PAGO' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                             bill.status === 'VENCIDO' ? "bg-rose-50 text-rose-600 border-rose-100" :
                             "bg-primary text-black border-primary/20 shadow-primary/10"
                           )}>
                             {bill.status}
                           </span>
                           <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                             Venc: {format(parseLocalDate(bill.dueDate), "dd/MM/yyyy")}
                           </span>
                        </div>
                        <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight tracking-tighter">{bill.description}</h3>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 flex flex-col items-center justify-center gap-1 md:gap-1.5 border border-slate-100 shadow-inner">
                       <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest">Valor do Título</p>
                       <p className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">
                         {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.amount)}
                       </p>
                    </div>

                    {bill.status !== 'PAGO' && (
                      <div className="space-y-3 md:space-y-4">
                        <button 
                          onClick={() => copyToClipboard(bill.barCode)}
                          className="w-full py-4 md:py-5 bg-white hover:bg-slate-50 rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-slate-500 transition-all flex items-center justify-center gap-3 border border-slate-200 shadow-sm"
                        >
                          <Copy className="w-4 md:w-4.5 h-4 md:h-4.5" />
                          Código de Barras
                        </button>
                        <div className="grid grid-cols-2 gap-3 md:gap-4">
                           <a 
                            href={bill.bankSlipUrl} 
                            target="_blank"
                            className="py-4 md:py-5 bg-slate-900 hover:bg-black rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2 md:gap-3 shadow-xl"
                          >
                            <Download className="w-4 md:w-4.5 h-4 md:h-4.5" />
                            PDF
                          </a>
                          <a 
                            href={bill.paymentLink} 
                            target="_blank"
                            className="py-4 md:py-5 yellow-button text-black rounded-xl md:rounded-2xl text-[9px] md:text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3"
                          >
                            <ExternalLink className="w-4 md:w-4.5 h-4 md:h-4.5" />
                            Pagar
                          </a>
                        </div>
                      </div>
                    )}

                    {bill.status === 'PAGO' && (
                      <div className="flex flex-col items-center gap-3 md:gap-4 text-emerald-500 bg-emerald-50 p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-emerald-100 justify-center">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-sm shrink-0">
                          <CheckCircle2 className="w-6 md:w-7 h-6 md:h-7" />
                        </div>
                        <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em]">Pagamento Realizado</span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Latest Documents */}
        <div className="space-y-8">
          <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
               <FileText className="w-5 h-5 text-primary" />
            </div>
            Últimos Arquivos
          </h3>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-sm">
             <div className="p-8 border-b border-slate-50 bg-slate-50/50">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Gestão de Contratos</p>
             </div>
             
             <div className="divide-y divide-slate-50">
                {documents.length === 0 ? (
                  <div className="p-16 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto">
                       <FileText className="w-8 h-8 text-slate-200" />
                    </div>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Nenhum documento disponível</p>
                  </div>
                ) : (
                  documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={getAssetUrl(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-5 p-7 hover:bg-slate-50 transition-colors group"
                    >
                      <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-300 group-hover:text-primary group-hover:bg-white transition-all">
                        <FileText className="w-7 h-7" />
                      </div>
                      <div className="space-y-1.5 overflow-hidden">
                        <h4 className="text-slate-900 font-black uppercase tracking-tight text-[11px] group-hover:text-primary transition-colors truncate">
                          {doc.name}
                        </h4>
                        <div className="flex items-center gap-2">
                           <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest">
                             {format(new Date(doc.createdAt), "dd MMM yyyy", { locale: ptBR })}
                           </span>
                        </div>
                      </div>
                    </a>
                  ))
                )}
             </div>
             
             {documents.length > 0 && (
               <div className="p-8 bg-slate-50/30">
                  <a href="/tenant/documents" className="block text-center py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-all shadow-sm">
                    Ver Todos os Documentos
                  </a>
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
