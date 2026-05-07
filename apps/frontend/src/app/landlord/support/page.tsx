'use client';

import { useState } from 'react';
import { MessageCircle, ShieldCheck, Clock, Send, HelpCircle } from 'lucide-react';
import Cookies from 'js-cookie';

export default function LandlordSupport() {
  const [message, setMessage] = useState('');
  const whatsappNumber = '552122347818';
  const userName = Cookies.get('user_name') || 'Proprietário';
  
  const handleSupport = () => {
    if (!message.trim()) {
      const text = encodeURIComponent(`Olá, me chamo ${userName} e gostaria de falar com o suporte para proprietários.`);
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
      return;
    }
    
    const fullMessage = `Olá, me chamo ${userName} (Proprietário).\n\n*Mensagem:* ${message}`;
    const text = encodeURIComponent(fullMessage);
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank');
  };

  return (
    <div className="space-y-12 max-w-2xl mx-auto pb-24">
      {/* Header Section */}
      <div className="flex flex-col items-center text-center space-y-4 pt-4">
        <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center p-4 shadow-xl shadow-slate-200/50">
           <HelpCircle className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tighter uppercase leading-none">Central do Proprietário</h1>
          <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase opacity-80">Gestão patrimonial e atendimento SLX</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/40">
        <div className="p-10 space-y-10">
           <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-primary shadow-sm">
                <MessageCircle className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-xl font-extrabold text-slate-900 uppercase tracking-tighter">Atendimento Prioritário</h2>
                <p className="text-slate-400 text-sm font-bold opacity-70">Fale com seu gestor de conta via WhatsApp.</p>
              </div>
           </div>

           <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Sua Solicitação</label>
              <textarea 
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ex: Gostaria de informações sobre o repasse do mês de Abril do imóvel da Rua Haroldo..."
                className="w-full bg-slate-50 border border-slate-100 rounded-[2rem] p-8 text-slate-900 text-sm font-bold focus:outline-none focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all min-h-[180px] placeholder:text-slate-300 resize-none shadow-inner"
              />
           </div>
           
           <button 
             onClick={handleSupport}
             className="w-full py-6 yellow-button text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-4 group"
           >
             Falar com o Suporte
             <Send className="w-4.5 h-4.5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
           </button>
        </div>

        <div className="bg-slate-50 p-10 grid grid-cols-2 gap-10 border-t border-slate-100">
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-sm">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Expediente</p>
                <p className="text-sm font-extrabold text-slate-900 tracking-tight">09h às 18h</p>
              </div>
           </div>
           <div className="flex items-center gap-5">
              <div className="w-12 h-12 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</p>
                <p className="text-sm font-extrabold text-slate-900 tracking-tight">Prioritário</p>
              </div>
           </div>
        </div>
      </div>

      <div className="p-10 bg-amber-50 border border-amber-100 rounded-[2.5rem] space-y-4 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
         <div className="w-14 h-14 bg-white border border-amber-200 rounded-2xl flex items-center justify-center text-amber-500 shadow-xl shadow-amber-200/30 shrink-0">
            <HelpCircle className="w-7 h-7" />
         </div>
         <div className="space-y-1">
            <h4 className="text-amber-900 font-extrabold text-[11px] uppercase tracking-[0.2em]">
              Gestão Patrimonial
            </h4>
            <p className="text-amber-800/70 text-sm font-bold leading-tight">
              Para agilizar o atendimento, informe o endereço do imóvel referente à sua dúvida ou solicitação.
            </p>
         </div>
      </div>
    </div>
  );
}
