'use client';

import { 
  Shield, 
  Mail, 
  MoreVertical, 
  Plus, 
  UserPlus, 
  Lock, 
  ShieldCheck, 
  ArrowLeft,
  Eye,
  Edit3,
  FileText,
  Users,
  Receipt,
  RefreshCw,
  Check,
  X,
  Trash2,
  ChevronRight,
  UserCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';
import { useBranding } from '@/components/BrandingProvider';

export default function TeamPage() {
  const { branding } = useBranding();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
  });
  
  const defaultPermissions = {
    financial_view: false,
    financial_edit: false,
    users_view: false,
    users_edit: false,
    docs_view: false,
    docs_edit: false,
    asaas_sync: false
  };

  const [form, setForm] = useState({ 
    name: '', 
    email: '', 
    password: '', 
    role: 'TENANT',
    permissions: { ...defaultPermissions }
  });

  const loadTeam = async () => {
    setLoading(true);
    try {
      const response = await fetchApi('/users/team');
      setMembers(response.data || []);
    } catch (error) {
      console.error('Failed to load team:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handlePermissionToggle = (key: string) => {
    setForm(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key as keyof typeof defaultPermissions]: !prev.permissions[key as keyof typeof defaultPermissions]
      }
    }));
  };

  const openEdit = (member: any) => {
    let perms = { ...defaultPermissions };
    try {
      if (member.permissions) {
        const parsed = typeof member.permissions === 'string' ? JSON.parse(member.permissions) : member.permissions;
        perms = { ...perms, ...parsed };
      }
    } catch (e) {}

    setForm({
      name: member.name,
      email: member.email,
      password: '', 
      role: member.role,
      permissions: perms
    });
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.email || (!editingId && !form.password)) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        ...form,
        permissions: form.role === 'ADMIN' ? Object.keys(defaultPermissions).reduce((acc, k) => ({ ...acc, [k]: true }), {}) : form.permissions
      };

      if (editingId) {
        await fetchApi(`/users/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await fetchApi('/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setForm({ name: '', email: '', password: '', role: 'USER', permissions: { ...defaultPermissions } });
      loadTeam();
      toast.success(editingId ? 'Colaborador atualizado!' : 'Colaborador criado!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remover Colaborador',
      message: 'Tem certeza que deseja remover este colaborador? O acesso dele será revogado imediatamente.',
      onConfirm: async () => {
        try {
          await fetchApi(`/users/${id}`, { method: 'DELETE' });
          loadTeam();
          toast.success('Colaborador removido!');
        } catch (error: any) {
          toast.error('Erro ao remover colaborador.');
        }
      }
    });
  };

  const permissionGroups = [
    { title: 'Financeiro', icon: Receipt, perms: [{ key: 'financial_view', label: 'Visualizar', icon: Eye }, { key: 'financial_edit', label: 'Editar/Gerar', icon: Edit3 }] },
    { title: 'Usuários', icon: Users, perms: [{ key: 'users_view', label: 'Visualizar', icon: Eye }, { key: 'users_edit', label: 'Editar Base', icon: Edit3 }] },
    { title: 'Documentos', icon: FileText, perms: [{ key: 'docs_view', label: 'Visualizar', icon: Eye }, { key: 'docs_edit', label: 'Enviar/Editar', icon: Edit3 }] },
    { title: 'Sistema', icon: RefreshCw, perms: [{ key: 'asaas_sync', label: 'Sincronizar Asaas', icon: RefreshCw }] },
  ];

  return (
    <div className="min-h-screen bg-white p-6 space-y-8 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center p-3 shadow-xl shadow-slate-100/50 overflow-hidden">
             {branding?.logoUrl ? (
               <img src={branding.logoUrl} alt="SLX" className="max-w-full max-h-full object-contain" />
             ) : (
               <UserCircle2 className="w-10 h-10 text-primary" />
             )}
          </div>
          <div>
            <div className="flex items-center gap-3 text-slate-400 mb-1">
               <Link href="/dashboard" className="hover:text-primary transition-colors text-[10px] uppercase font-black tracking-widest">Dashboard</Link>
               <ChevronRight className="w-3 h-3" />
               <span className="text-slate-900 text-[10px] uppercase font-black tracking-widest">Equipe</span>
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              Gestão de Equipe
            </h1>
            <p className="text-slate-500 text-sm mt-0.5 font-medium italic">Controle total sobre acessos e operadores internos.</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditingId(null); setForm({ name: '', email: '', password: '', role: 'USER', permissions: { ...defaultPermissions } }); setIsModalOpen(true); }}
          className="yellow-button text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center gap-3 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          <UserPlus className="w-4.5 h-4.5" />
          Novo Colaborador
        </button>
      </div>

      <div className="bg-white border border-slate-100 rounded-[2.5rem] shadow-2xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="p-8 text-slate-400 font-black text-[10px] uppercase tracking-widest">Colaborador</th>
                <th className="p-8 text-slate-400 font-black text-[10px] uppercase tracking-widest">Nível de Acesso</th>
                <th className="p-8 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cadastro</th>
                <th className="p-8 text-slate-400 font-black text-[10px] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-20 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">Buscando colaboradores...</p>
                  </div>
                </td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={4} className="p-32 text-center">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Users className="w-10 h-10 text-slate-200" />
                  </div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Nenhum colaborador encontrado.</p>
                </td></tr>
              ) : members.map((member, i) => (
                <motion.tr 
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/30 transition-colors group"
                >
                  <td className="p-8">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 font-black text-xl shadow-sm group-hover:bg-primary group-hover:border-primary group-hover:text-black transition-all duration-300">
                        {(member.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-slate-900 font-black text-base leading-tight tracking-tight">{member.name}</div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-1.5 font-bold uppercase tracking-wider">
                          <Mail className="w-3.5 h-3.5" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] border shadow-sm ${
                      member.role === 'ADMIN' 
                        ? 'bg-primary text-black border-primary' 
                        : 'bg-white text-slate-400 border-slate-100'
                    }`}>
                      <Shield className="w-3.5 h-3.5" />
                      {member.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                    </div>
                  </td>
                  <td className="p-8 text-slate-500 text-xs font-black uppercase tracking-tighter">
                    {new Date(member.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-8 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <button 
                        onClick={() => openEdit(member)}
                        className="p-3.5 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all shadow-sm border border-transparent hover:border-slate-100"
                      >
                        <Edit3 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(member.id)}
                        className="p-3.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden border border-white my-auto"
            >
              <div className="p-12 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tighter">{editingId ? 'Editar' : 'Novo'} Colaborador</h2>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2">Defina os níveis de acesso e controle</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-colors">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-12 space-y-10 max-h-[60vh] overflow-y-auto scrollbar-hide bg-slate-50/20">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full bg-white border border-slate-200 rounded-2xl py-5 px-7 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input 
                      type="email" value={form.email}
                      onChange={(e) => setForm({...form, email: e.target.value})}
                      placeholder="joao@slx.com"
                      className="w-full bg-white border border-slate-200 rounded-2xl py-5 px-7 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{editingId ? 'Alterar Senha (opcional)' : 'Senha de Acesso'}</label>
                  <div className="relative">
                    <Lock className="absolute left-7 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                    <input 
                      type="password" value={form.password}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-2xl py-5 pl-16 pr-7 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                  <div className="grid grid-cols-2 gap-8">
                    {[
                      { label: 'Administrador', value: 'ADMIN', desc: 'Acesso total ao sistema' },
                      { label: 'Operador', value: 'TENANT', desc: 'Permissões limitadas' }
                    ].map((r) => (
                      <button
                        key={r.value} onClick={() => setForm({...form, role: r.value})}
                        className={`p-10 rounded-[2.5rem] text-left border-2 transition-all relative overflow-hidden shadow-sm ${
                          form.role === r.value 
                            ? 'bg-white border-primary shadow-xl shadow-primary/10' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`text-sm font-black uppercase tracking-widest ${form.role === r.value ? 'text-primary' : 'text-slate-900'}`}>{r.label}</div>
                        <div className="text-[10px] text-slate-400 mt-2 font-bold leading-relaxed">{r.desc}</div>
                        {form.role === r.value && (
                          <div className="absolute top-6 right-6 bg-primary text-black p-2 rounded-full shadow-lg border border-white"><Check className="w-4 h-4" /></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <AnimatePresence>
                  {form.role === 'TENANT' && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                      className="space-y-8 pt-8 border-t border-slate-100"
                    >
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permissões Específicas</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {permissionGroups.map((group, gIdx) => (
                          <div key={gIdx} className="bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-6 shadow-sm">
                            <div className="flex items-center gap-4">
                               <div className="p-3 bg-slate-50 rounded-2xl"><group.icon className="w-5 h-5 text-slate-900" /></div>
                               <h4 className="text-slate-900 font-black text-[11px] uppercase tracking-widest">{group.title}</h4>
                            </div>
                            <div className="space-y-3.5">
                              {group.perms.map((perm) => {
                                const isActive = form.permissions[perm.key as keyof typeof defaultPermissions];
                                return (
                                  <button
                                    key={perm.key}
                                    onClick={() => handlePermissionToggle(perm.key)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all border shadow-sm ${
                                      isActive 
                                        ? 'bg-primary/5 border-primary/20 text-slate-900' 
                                        : 'bg-slate-50/50 border-transparent text-slate-400 hover:bg-slate-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-4">
                                      <perm.icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-slate-300'}`} />
                                      <span className="text-xs font-black uppercase tracking-tight">{perm.label}</span>
                                    </div>
                                    <div className={`w-10 h-5.5 rounded-full relative transition-all duration-300 ${isActive ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200'}`}>
                                       <div className={`absolute top-1 w-3.5 h-3.5 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-5.5' : 'left-1'}`} />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-12 bg-white border-t border-slate-50 flex justify-end gap-8 items-center">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="yellow-button text-black px-14 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Gravando...' : (editingId ? 'Salvar Alterações' : 'Confirmar Cadastro')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
