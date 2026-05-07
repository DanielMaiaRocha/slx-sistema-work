'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { User, ArrowRight, ShieldCheck, MessageCircle } from 'lucide-react';
import Link from 'next/link';

export default function FirstAccessPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState('');
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  const formatCpf = (value: string) => {
    const v = value.replace(/\D/g, '');
    return v
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpf(formatCpf(e.target.value));
  };

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetchApi('/auth/first-access', {
        method: 'POST',
        body: JSON.stringify({ 
          cpf: cpf.replace(/\D/g, ''),
          email 
        }),
      });

      setSent(true);
      toast.success('Link enviado para seu e-mail!');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao processar. Verifique os dados.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/20 border border-emerald-500/20">
          <MessageCircle className="w-10 h-10" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h1 className="text-3xl font-black text-white tracking-tight">Tudo certo!</h1>
          <p className="text-slate-400 font-medium leading-relaxed">
            Enviamos um link de acesso para o e-mail: <br/>
            <span className="text-white font-bold">{email}</span>
          </p>
        </div>
        <Link 
          href="/login/inquilinos" 
          className="px-8 py-4 bg-white/5 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] border border-white/10 hover:bg-white/10 transition-all"
        >
          Voltar para Login
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-primary/10 rounded-full blur-[100px]" />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="space-y-2">
          <Link href="/login/inquilinos" className="text-slate-500 hover:text-white transition-colors text-xs font-black uppercase tracking-widest flex items-center gap-2 mb-8">
             <ArrowRight className="w-4 h-4 rotate-180" />
             Voltar
          </Link>
          <div className="flex justify-start">
             <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-2xl shadow-primary/20 border border-primary/20">
                <ShieldCheck className="w-8 h-8" />
             </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight pt-2">Primeiro Acesso</h1>
          <p className="text-slate-400 font-medium leading-relaxed">
            Informe seu CPF e o e-mail onde deseja receber o link de acesso.
          </p>
        </div>

        <form onSubmit={handleSendLink} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Seu CPF</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={cpf}
                onChange={handleCpfChange}
                maxLength={14}
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-900 transition-all font-medium"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail para Receber o Link</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-primary transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-900/50 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:border-primary/50 focus:bg-slate-900 transition-all font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 financial-gradient text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
          >
            {loading ? 'Enviando...' : 'Receber Link por E-mail'}
            {!loading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
