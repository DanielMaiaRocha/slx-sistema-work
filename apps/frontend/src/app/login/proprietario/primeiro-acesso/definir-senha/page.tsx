'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import { toast } from 'react-hot-toast';
import { Lock, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function LandlordSetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error('Token de acesso não encontrado');
      router.push('/login/proprietario');
    }
  }, [token, router]);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return toast.error('As senhas não coincidem');
    }

    if (password.length < 6) {
      return toast.error('A senha deve ter pelo menos 6 caracteres');
    }

    setLoading(true);

    try {
      await fetchApi('/auth/set-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });

      setSuccess(true);
      toast.success('Senha definida com sucesso!');
    } catch (error: any) {
      toast.error(error.message || 'Falha ao definir senha. O link pode ter expirado.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center space-y-8">
        <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-2xl shadow-emerald-500/10 border border-emerald-100">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <div className="space-y-4 max-w-sm">
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Senha Definida!</h1>
          <p className="text-slate-400 font-medium leading-relaxed text-sm">
            Proprietário, sua senha foi cadastrada com sucesso. Agora você já pode gerenciar seu patrimônio.
          </p>
        </div>
        <Link 
          href="/login/proprietario" 
          className="w-full max-w-xs py-5 yellow-button text-black rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Ir para o Login
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-slate-50 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-[400px] space-y-10 relative z-10">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
             <div className="w-20 h-20 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-center p-4 shadow-2xl shadow-slate-200/50">
                <ShieldCheck className="w-12 h-12 text-primary" />
             </div>
          </div>
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Definir Nova Senha</h1>
            <p className="text-slate-500 font-medium text-sm">Crie uma senha segura para acessar sua área de proprietário.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/40">
          <form onSubmit={handleSetPassword} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Nova Senha</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Confirmar Senha</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 yellow-button text-black rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
            >
              {loading ? 'Salvando...' : 'Salvar Senha'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LandlordSetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LandlordSetPasswordForm />
    </Suspense>
  );
}
