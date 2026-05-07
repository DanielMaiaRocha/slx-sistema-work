'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck, Mail, Lock, UserCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useBranding } from '@/components/BrandingProvider';
import Link from 'next/link';

export default function LoginPage() {
  const { branding } = useBranding();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login(email, password, 'slx'); 
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Erro ao entrar');
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-slate-50 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[420px] space-y-10 relative z-10"
      >
        <div className="text-center space-y-4">
          <div className="flex justify-center">
             <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center p-4 shadow-2xl shadow-slate-200/50 overflow-hidden">
                {branding?.logoUrl ? (
                  <img src={branding.logoUrl} alt="SLX" className="max-w-full max-h-full object-contain" />
                ) : (
                  <UserCircle2 className="w-12 h-12 text-primary" />
                )}
             </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Área Administrativa</h1>
            <p className="text-slate-500 font-medium text-sm">Gerencie o financeiro da sua imobiliária.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-10 rounded-[2.5rem] shadow-2xl shadow-slate-200/40">
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-500 p-4 rounded-2xl mb-8 text-xs font-bold uppercase tracking-widest text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">E-mail de Acesso</label>
              <div className="relative group">
                <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Sua Senha</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-sm"
                  required
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full yellow-button text-black font-black uppercase tracking-widest text-[11px] py-5 rounded-2xl shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 mt-4"
            >
              <LogIn className="w-5 h-5" />
              Entrar no Sistema
            </button>
          </form>
        </div>

        <div className="text-center space-y-8">
          <div className="flex items-center justify-center gap-8 pt-2">
             <Link href="/login/inquilinos" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                Sou Inquilino
             </Link>
             <Link href="/login/proprietario" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                Sou Proprietário
             </Link>
          </div>
          
          <div className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
             SLX Imobiliária &copy; 2026
          </div>
        </div>
      </motion.div>
    </div>
  );
}
