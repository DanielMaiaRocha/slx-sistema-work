'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';
import { User, Lock, ArrowRight, ShieldCheck, UserCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useBranding } from '@/components/BrandingProvider';

export default function LandlordLoginPage() {
  const { branding } = useBranding();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetchApi('/auth/login-tenant', {
        method: 'POST',
        body: JSON.stringify({ 
          cpf: cpf.replace(/\D/g, ''), 
          password,
          intendedRole: 'LANDLORD'
        }),
      });

      const cookieOptions = { expires: 7, path: '/', sameSite: 'lax' as const };
      Cookies.set('token', response.token, cookieOptions);
      Cookies.set('user', JSON.stringify(response.user), cookieOptions);
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));

      // Also set legacy individual cookies if needed for other parts of the app
      Cookies.set('user_role', response.user.role, cookieOptions);
      Cookies.set('user_name', response.user.name, cookieOptions);
      // tenant_logo is no longer cookie-stored: the logo can be a >1MB
      // base64 data URI, which exceeds the cookie size limit and fails
      // silently. Layouts read it from BrandingProvider instead.
      
      toast.success('Login realizado com sucesso!');
      
      const userRoles = response.user.role || '';
      if (userRoles.includes('LANDLORD') || userRoles.includes('OWNER') || userRoles.includes('ADMIN')) {
        router.push('/landlord/dashboard');
      } else {
        toast.error('Este acesso é exclusivo para proprietários.');
        Cookies.remove('token');
      }
    } catch (error: any) {
      toast.error(error.message || 'Falha no login. Verifique seus dados.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Subtle Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-slate-50 rounded-full blur-[120px] -z-10" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] -z-10" />

      <div className="w-full max-w-[400px] space-y-10 relative z-10">
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
            <h1 className="text-3xl font-black text-slate-900 tracking-tighter">Área do Proprietário</h1>
            <p className="text-slate-500 font-medium text-sm">Gestão simplificada do seu patrimônio imobiliário.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-200/40">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Documento (CPF)</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <User className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={handleCpfChange}
                  maxLength={14}
                  className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-14 pr-6 text-slate-900 placeholder:text-slate-300 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/5 transition-all font-bold shadow-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Sua Senha</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">
                  <Lock className="w-5 h-5" />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
              {loading ? 'Acessando...' : 'Entrar na Área do Proprietário'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <Link 
              href="/login/proprietario/primeiro-acesso" 
              className="text-xs font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"
            >
              Primeiro acesso? <span className="text-primary underline underline-offset-4 decoration-2">Clique aqui</span>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 pt-8 border-t border-slate-100">
             <Link href="/login/inquilinos" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                Sou Inquilino
             </Link>
             <Link href="/login" className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                Sou Imobiliária
             </Link>
          </div>
        </div>
      </div>

      <footer className="absolute bottom-8 text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">
         SLX Imobiliária &copy; 2026
      </footer>
    </div>
  );
}
