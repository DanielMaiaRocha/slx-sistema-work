'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, Loader2, UserCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useBranding } from '@/components/BrandingProvider';
import Link from 'next/link';

export default function LoginPage() {
  const { branding } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password, 'slx');
    
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Erro ao realizar login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-slate-50 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] space-y-10 relative z-10"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
             <div className="w-24 h-24 bg-white border border-slate-100 rounded-[2.5rem] flex items-center justify-center p-5 shadow-2xl shadow-slate-200/50 overflow-hidden">
                {branding?.logoUrl ? (
                  <img src={branding.logoUrl} alt="SLX" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center">
                    <span className="text-2xl font-black tracking-tighter text-slate-900">SLX</span>
                    <span className="text-[8px] font-black uppercase tracking-widest text-primary leading-none">Imobiliária</span>
                  </div>
                )}
             </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Painel Administrativo</h1>
            <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase opacity-80 mt-2">Gestão Financeira & Operacional SLX</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-10 rounded-[3rem] shadow-2xl shadow-slate-200/40">
          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-4 rounded-2xl mb-8 text-center"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail Corporativo</label>
              <div className="relative group">
                <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-inner"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Senha de Acesso</label>
              <div className="relative group">
                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                <input 
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-5 pl-16 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:bg-white focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-inner"
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full yellow-button text-black py-6 rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 group mt-4"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="text-center space-y-8">
          <div className="flex flex-col items-center gap-4">
             <div className="flex items-center justify-center gap-8">
                <Link href="/login/inquilinos" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                  Sou Inquilino
                </Link>
                <Link href="/login/proprietario" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                  Sou Proprietário
                </Link>
             </div>
             <p className="text-slate-300 font-bold text-[9px] uppercase tracking-widest max-w-[280px] leading-relaxed">
               Acesso restrito a colaboradores autorizados da SLX Imobiliária.
             </p>
          </div>
          
          <footer className="text-[10px] font-black text-slate-200 uppercase tracking-[0.3em]">
             SLX Imobiliária &copy; 2026
          </footer>
        </div>
      </motion.div>
    </div>
  );
}
