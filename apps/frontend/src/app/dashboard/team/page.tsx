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
    <div className="w-full py-4 sm:py-8 space-y-5 sm:space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Gestão de Equipe</h1>
          <p className="text-slate-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.15em]">Controle de acessos e operadores</p>
        </div>
        <button 
          onClick={() => { setEditingId(null); setForm({ name: '', email: '', password: '', role: 'USER', permissions: { ...defaultPermissions } }); setIsModalOpen(true); }}
          className="yellow-button w-full sm:w-auto text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-primary/20"
        >
          <UserPlus className="w-4 h-4" />
          Novo Colaborador
        </button>
      </div>

      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="glass-card p-8 text-center bg-white border-slate-200 shadow-sm">
            <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Buscando...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="glass-card p-8 text-center bg-white border-slate-200 shadow-sm">
            <Users className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-xs font-bold">Nenhum colaborador.</p>
          </div>
        ) : members.map((member, i) => (
          <motion.div 
            key={member.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card p-4 bg-white border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 font-black text-sm shrink-0">
                {(member.name || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">{member.name}</h3>
                <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
              </div>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-wider border shrink-0 ${
                member.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-50 text-slate-400 border-slate-100'
              }`}>
                <Shield className="w-2.5 h-2.5" />
                {member.role === 'ADMIN' ? 'Admin' : 'Operador'}
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
              <p className="text-[9px] text-slate-400 font-bold">{new Date(member.createdAt).toLocaleDateString('pt-BR')}</p>
              <div className="flex items-center gap-1.5">
                <button onClick={() => openEdit(member)} className="p-2 text-slate-400 hover:text-slate-900 rounded-lg transition-all active:scale-95 border border-slate-100">
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-all active:scale-95 border border-slate-100">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/30 border-b border-slate-100">
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Colaborador</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Nível</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest">Cadastro</th>
                <th className="p-5 text-slate-400 font-black text-[10px] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="p-12 text-center">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Buscando...</p>
                </td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan={4} className="p-20 text-center">
                  <Users className="w-10 h-10 text-slate-200 mx-auto mb-4" />
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
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-slate-900 font-black text-lg shadow-sm">
                        {(member.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-slate-900 font-bold text-sm">{member.name}</div>
                        <div className="text-slate-400 text-[10px] flex items-center gap-1.5 mt-1 font-bold uppercase tracking-wider">
                          <Mail className="w-3 h-3" />
                          {member.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider border ${
                      member.role === 'ADMIN' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-slate-50 text-slate-400 border-slate-100'
                    }`}>
                      <Shield className="w-3 h-3" />
                      {member.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                    </span>
                  </td>
                  <td className="p-5 text-slate-500 text-xs font-bold">{new Date(member.createdAt).toLocaleDateString('pt-BR')}</td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(member)} className="p-2.5 text-slate-300 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-all border border-transparent hover:border-slate-100">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(member.id)} className="p-2.5 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all border border-transparent hover:border-rose-100">
                        <Trash2 className="w-4 h-4" />
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
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-white my-auto"
            >
              <div className="p-6 sm:p-10 border-b border-slate-50 flex items-center justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">{editingId ? 'Editar' : 'Novo'} Colaborador</h2>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">Defina os níveis de acesso</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-3 text-slate-300 hover:text-slate-900 transition-colors">
                   <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide bg-slate-50/20">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" value={form.name}
                      onChange={(e) => setForm({...form, name: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Corporativo</label>
                    <input 
                      type="email" value={form.email}
                      onChange={(e) => setForm({...form, email: e.target.value})}
                      placeholder="joao@slx.com"
                      className="w-full bg-white border border-slate-200 rounded-xl py-3.5 px-4 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{editingId ? 'Alterar Senha (opcional)' : 'Senha de Acesso'}</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="password" value={form.password}
                      onChange={(e) => setForm({...form, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full bg-white border border-slate-200 rounded-xl py-3.5 pl-11 pr-4 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Perfil de Acesso</label>
                  <div className="grid grid-cols-2 gap-3 sm:gap-6">
                    {[
                      { label: 'Administrador', value: 'ADMIN', desc: 'Acesso total ao sistema' },
                      { label: 'Operador', value: 'TENANT', desc: 'Permissões limitadas' }
                    ].map((r) => (
                      <button
                        key={r.value} onClick={() => setForm({...form, role: r.value})}
                        className={`p-4 sm:p-6 rounded-2xl text-left border-2 transition-all relative overflow-hidden shadow-sm ${
                          form.role === r.value 
                            ? 'bg-white border-primary shadow-xl shadow-primary/10' 
                            : 'bg-white border-slate-100 hover:border-slate-200'
                        }`}
                      >
                        <div className={`text-xs font-black uppercase tracking-widest ${form.role === r.value ? 'text-primary' : 'text-slate-900'}`}>{r.label}</div>
                        <div className="text-[9px] text-slate-400 mt-1 font-bold leading-relaxed hidden sm:block">{r.desc}</div>
                        {form.role === r.value && (
                          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 bg-primary text-black p-1.5 rounded-full shadow-lg border border-white"><Check className="w-3 h-3" /></div>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                        {permissionGroups.map((group, gIdx) => (
                          <div key={gIdx} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 shadow-sm">
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

              <div className="p-6 sm:p-10 bg-white border-t border-slate-50 flex flex-col sm:flex-row justify-end gap-4 sm:gap-6 items-center">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-slate-900 transition-colors text-[10px] font-black uppercase tracking-widest order-2 sm:order-1"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="yellow-button w-full sm:w-auto text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 order-1 sm:order-2"
                >
                  {isSaving ? 'Gravando...' : (editingId ? 'Salvar' : 'Confirmar')}
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
