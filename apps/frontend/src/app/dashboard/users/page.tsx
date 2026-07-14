'use client';

import { Users, Search, Mail, MoreVertical, Shield, ChevronDown, ChevronLeft, ChevronRight, Check, X, FilePlus, FileText, Trash2, FileUp, ExternalLink, Pencil, Plus, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';
import { fetchApi } from '@/lib/api';
import { getAssetUrl } from '@/lib/utils';
import { formatCPF, formatPhone as maskPhone, onlyDigits } from '@/lib/format';
import { useAuth } from '@/hooks/useAuth';
import ConfirmModal from '@/components/ConfirmModal';
import UserDetailModal from '@/components/UserDetailModal';
import Cookies from 'js-cookie';
import { toast } from 'react-hot-toast';

const formatCpfCnpj = (v: string) => {
  if (!v || v === 'N/A') return v;
  const digits = v.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return v;
};

const formatPhone = (v: string) => {
  if (!v || v === 'N/A') return v;
  let digits = v.replace(/\D/g, '');
  if (digits.length > 11) digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const isProprietario = (role: string) => {
  const roles = (role || '').split(',');
  return roles.includes('LANDLORD') || roles.includes('OWNER');
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [pagination, setPagination] = useState<any>(null);
  const [filters, setFilters] = useState({ search: '', role: '' });
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isRoleOpen, setIsRoleOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', password: 'FIRST_ACCESS_PENDING', phone: '', cpf: '', role: 'LANDLORD', properties: [] });
  const [cpfCheck, setCpfCheck] = useState<{ status: 'idle' | 'checking' | 'exists' | 'free'; name?: string; source?: string }>({ status: 'idle' });
  const [isSaving, setIsSaving] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [docUser, setDocUser] = useState<any>(null);
  const [docUploading, setDocUploading] = useState(false);
  const [docForm, setDocForm] = useState<{ name: string; visibility: string; type: string; address?: string }>({ name: '', visibility: 'ALL', type: 'CONTRACT_LEASE', address: '' });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isVisibilityDropdownOpen, setIsVisibilityDropdownOpen] = useState(false);
  const typeDropdownRef = useRef<HTMLDivElement>(null);
  const visibilityDropdownRef = useRef<HTMLDivElement>(null);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [docModalType, setDocModalType] = useState<'CONTRACT' | 'DOCUMENT'>('DOCUMENT');
  const [propertiesForDoc, setPropertiesForDoc] = useState<any[]>([]);

  const loadPropertiesForDoc = async (userId: string) => {
    try {
      const data = await fetchApi(`/users/${userId}/properties`);
      setPropertiesForDoc(data || []);
    } catch (err) {
      console.error('Error loading properties for doc:', err);
      setPropertiesForDoc([]);
    }
  };

  const LIMIT = 15;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [confirmConfig, setConfirmConfig] = useState<any>({
    isOpen: false,
    title: '',
    message: '',
  });

  const { login } = useAuth();

  const roles = [
    { label: 'Inquilino', value: 'TENANT' },
    { label: 'Proprietário', value: 'LANDLORD' },
    { label: 'Administrador', value: 'ADMIN' },
  ];

  const docTypes = [
    { label: 'Contrato de Locação', value: 'CONTRACT_LEASE' },
    { label: 'Contrato de Administração', value: 'CONTRACT_ADMIN' },
    { label: 'Contrato de Compra e Venda', value: 'CONTRACT_SALE' },
    { label: 'Contrato de Arras', value: 'CONTRACT_ARRAS' },
    { label: 'Contrato de Financiamento', value: 'CONTRACT_FINANCE' },
    { label: 'Documento Geral', value: 'DOCUMENT' },
    { label: 'Recibo / Comprovante', value: 'RECEIPT' },
    { label: 'Identidade / CPF', value: 'ID' },
  ];

  const visibilityOptions = [
    { label: 'Todos os Portais', value: 'ALL' },
    { label: 'Apenas Inquilino', value: 'TENANT' },
    { label: 'Apenas Proprietário', value: 'LANDLORD' },
  ];

  // Live CPF check: once 11 digits are typed, ask the backend whether this
  // person is already registered (locally or in Asaas) and warn before saving.
  useEffect(() => {
    if (!isCreateModalOpen) return;
    const cpf = newUserForm.cpf;
    if (cpf.length !== 11) {
      setCpfCheck({ status: 'idle' });
      return;
    }
    setCpfCheck({ status: 'checking' });
    const t = setTimeout(async () => {
      try {
        const r = await fetchApi(`/users/check-cpf?cpf=${cpf}`);
        if (r?.exists) setCpfCheck({ status: 'exists', name: r.name, source: r.source });
        else setCpfCheck({ status: 'free' });
      } catch {
        setCpfCheck({ status: 'idle' });
      }
    }, 450);
    return () => clearTimeout(t);
  }, [newUserForm.cpf, isCreateModalOpen]);

  const handleCreateUser = async () => {
    if (!newUserForm.name) {
      return toast.error('O nome é obrigatório');
    }
    if (cpfCheck.status === 'exists') {
      return toast.error(`CPF já cadastrado${cpfCheck.name ? ` para ${cpfCheck.name}` : ''}.`);
    }
    setIsSaving(true);
    try {
      await fetchApi('/users', {
        method: 'POST',
        body: JSON.stringify(newUserForm)
      });
      toast.success('Usuário criado com sucesso!');
      setIsCreateModalOpen(false);
      setNewUserForm({ name: '', email: '', password: 'FIRST_ACCESS_PENDING', phone: '', cpf: '', role: 'LANDLORD', properties: [] });
      setCpfCheck({ status: 'idle' });
      loadUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar usuário');
    } finally {
      setIsSaving(false);
    }
  };

  const loadUserDocs = async (userId: string) => {
    try {
      const data = await fetchApi(`/documents/user/${userId}`);
      setUserDocs(data);
    } catch (err) {
      console.error('Error loading docs:', err);
    }
  };

  const handleUploadDoc = async () => {
    if (!docForm.name) return toast.error('Preencha o nome do documento');
    if (!selectedFile && !editingDocId) return toast.error('Selecione um arquivo');
    
    setDocUploading(true);
    try {
      let fileUrl = '';
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const uploadData = await fetchApi('/upload', {
          method: 'POST',
          body: formData
        });
        fileUrl = uploadData.url;
      }

      if (editingDocId) {
        await fetchApi(`/documents/${editingDocId}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: docForm.name,
            visibility: docForm.visibility,
            type: docForm.type,
            address: docForm.address || '',
            ...(fileUrl && { url: fileUrl })
          })
        });
        toast.success('Documento atualizado!');
      } else {
        await fetchApi('/documents', {
          method: 'POST',
          body: JSON.stringify({
            name: docForm.name,
            url: fileUrl,
            userId: docUser.id,
            visibility: docForm.visibility,
            type: docForm.type,
            address: docForm.address || ''
          })
        });
        toast.success('Documento anexado!');
      }

      setSelectedFile(null);
      setEditingDocId(null);
      setDocForm({ name: '', visibility: 'ALL', type: 'CONTRACT_LEASE', address: '' });
      loadUserDocs(docUser.id);
    } catch (err: any) {
      toast.error(err.message || 'Erro no processo');
    } finally {
      setDocUploading(false);
    }
  };

  const handleEditDoc = (doc: any) => {
    setDocForm({ name: doc.name, visibility: doc.visibility, type: doc.type, address: doc.address || '' });
    setEditingDocId(doc.id);
    toast.success('Editando: ' + doc.name);
  };

  const handleDeleteDoc = (docId: string) => {
    triggerConfirm({
      title: 'Excluir Documento',
      message: 'Tem certeza que deseja remover este arquivo permanentemente? Esta ação não pode ser desfeita.',
      type: 'danger',
      onConfirm: () => processDeleteDoc(docId)
    });
  };

  const processDeleteDoc = async (docId: string) => {
    try {
      await fetchApi(`/documents/${docId}`, { method: 'DELETE' });
      toast.success('Documento excluído');
      if (docUser) loadUserDocs(docUser.id);
    } catch (err) {
      toast.error('Erro ao excluir documento');
    }
  };

  const toggleRole = (roleValue: string) => {
    if (!editingUser) return;
    const currentRoles = (editingUser.role || '').split(',').filter(Boolean);
    const newRoles = currentRoles.includes(roleValue)
      ? currentRoles.filter(r => r !== roleValue)
      : [...currentRoles, roleValue];
    
    setEditingUser({ ...editingUser, role: newRoles.join(',') || 'TENANT' });
  };

  const triggerConfirm = (config: any) => {
    setConfirmConfig({ ...config, isOpen: true });
  };

  const handleReconnect = async () => {
    await login('admin@slx.com', '123456', 'slx');
    setAuthError(false);
    setPage(0);
  };

  async function loadUsers() {
    setLoading(true);
    setUsers([]);
    try {
      const offset = page * LIMIT;
      let query = `/users/all?offset=${offset}&limit=${LIMIT}`;
      if (debouncedSearch) query += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (filters.role) query += `&role=${encodeURIComponent(filters.role)}`;
      const response = await fetchApi(query);
      setUsers(response.data || []);
      setPagination(response.pagination);
      setAuthError(false);
    } catch (error: any) {
      if (error.message.includes('token') || error.message.includes('auth')) setAuthError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsRoleOpen(false);
      if (typeDropdownRef.current && !typeDropdownRef.current.contains(event.target as Node)) setIsTypeDropdownOpen(false);
      if (visibilityDropdownRef.current && !visibilityDropdownRef.current.contains(event.target as Node)) setIsVisibilityDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.search), 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    loadUsers();
  }, [page, debouncedSearch, filters.role]);

  const selectRole = (value: string) => {
    setFilters(prev => ({ ...prev, role: value }));
    setIsRoleOpen(false);
    setPage(0);
  };

  const handleSave = async () => {
    if (!editingUser) return;
    setIsSaving(true);
    try {
      await fetchApi(`/users/${editingUser.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingUser.name,
          phone: editingUser.phone,
          role: editingUser.role,
          email: editingUser.email
        })
      });
      setIsModalOpen(false);
      loadUsers();
    } catch (error: any) {
      setConfirmConfig({
        isOpen: true,
        title: 'Erro ao Salvar',
        message: `Não foi possível salvar as alterações: ${error.message}${error.code ? ` (Code: ${error.code})` : ''}`,
        showCancel: false,
        confirmText: 'Entendi'
      });
    } finally {
      setIsSaving(false);
    }
  };

  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState(false);
  const [propertyUser, setPropertyUser] = useState<any>(null);
  const [userProperties, setUserProperties] = useState<any[]>([]);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<{ id: string; name: string } | null>(null);

  const openUserDetail = (user: any) => {
    setDetailUser({ id: user.id, name: user.name });
    setIsDetailOpen(true);
  };

  const handleEditProperties = async (user: any) => {
    setPropertyUser(user);
    setIsPropertyModalOpen(true);
    try {
      const data = await fetchApi(`/users/${user.id}/properties`);
      setUserProperties(data);
    } catch (err) {
      toast.error('Erro ao carregar imóveis');
    }
  };

  const handleSaveProperties = async () => {
    if (!propertyUser) return;
    setIsSaving(true);
    try {
      await fetchApi(`/users/${propertyUser.id}/properties`, {
        method: 'PUT',
        body: JSON.stringify({ properties: userProperties })
      });
      toast.success('Imóveis atualizados com sucesso!');
      setIsPropertyModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar imóveis');
    } finally {
      setIsSaving(false);
    }
  };

  const totalPages = pagination ? Math.ceil(pagination.total / LIMIT) : 0;
  
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(0, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages - 1, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(0, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6 text-center px-4">
        <div className="bg-rose-500/10 p-4 rounded-full"><Shield className="w-12 h-12 text-rose-500" /></div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Sessão Expirada</h2>
          <p className="text-slate-500 max-w-sm">Sua sessão de segurança expirou. Reconecte-se para continuar gerenciando os usuários.</p>
        </div>
        <button onClick={handleReconnect} className="yellow-button text-black px-10 py-4 rounded-2xl font-bold hover:scale-105 transition-all shadow-xl shadow-primary/20 cursor-pointer">Reconectar Agora</button>
      </div>
    );
  }

  return (
    <div className="w-full py-4 sm:py-8 space-y-5 sm:space-y-8">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-3xl font-black text-slate-900 tracking-tight">Usuários</h1>
        <p className="text-slate-400 text-[9px] sm:text-xs font-black uppercase tracking-[0.15em]">Gestão de Base Sincronizada</p>
      </div>

      <button 
        onClick={() => setIsCreateModalOpen(true)}
        className="yellow-button w-full sm:w-auto px-8 py-3.5 rounded-2xl shadow-xl shadow-primary/20 flex items-center justify-center gap-3 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
      >
        <Plus className="w-4 h-4 text-black" />
        <span className="font-black uppercase tracking-widest text-[10px] sm:text-xs text-black">Novo Proprietário</span>
      </button>

      <div className="glass-card p-4 sm:p-6 space-y-3 bg-white border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 w-4 h-4" />
          <input 
            value={filters.search}
            onChange={(e) => { setFilters(p => ({ ...p, search: e.target.value })); setPage(0); }}
            placeholder="Buscar por nome, CPF ou e-mail..."
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 pl-10 pr-4 text-slate-900 focus:border-primary/50 focus:bg-white outline-none transition-all text-sm placeholder:text-slate-300"
          />
        </div>

        <div className="relative" ref={dropdownRef}>
          <button 
            onClick={() => setIsRoleOpen(!isRoleOpen)}
            className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-3 flex items-center justify-between hover:border-primary/30 transition-all cursor-pointer text-xs"
          >
            <div className="flex items-center gap-2">
              <Shield className={`w-3.5 h-3.5 ${filters.role ? 'text-primary' : 'text-slate-400'}`} />
              <span className={filters.role ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                {filters.role ? (filters.role === 'TENANT' ? 'Inquilinos' : (filters.role === 'LANDLORD' ? 'Proprietários' : 'Administradores')) : 'Todos os Cargos'}
              </span>
            </div>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isRoleOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isRoleOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 5 }}
                className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
              >
                {[
                  { label: 'Todos os Cargos', value: '' },
                  { label: 'Inquilinos', value: 'TENANT' },
                  { label: 'Proprietários', value: 'LANDLORD' },
                  { label: 'Administradores', value: 'ADMIN' },
                ].map((role) => (
                  <button
                    key={role.value}
                    onClick={() => selectRole(role.value)}
                    className={`w-full text-left px-3 py-2.5 text-xs transition-colors hover:bg-slate-50 cursor-pointer flex items-center justify-between ${
                      filters.role === role.value ? 'text-primary bg-primary/5 font-bold' : 'text-slate-600'
                    }`}
                  >
                    {role.label}
                    {filters.role === role.value && <Check className="w-3.5 h-3.5 text-primary" />}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Mobile Cards View */}
      <div className="sm:hidden space-y-3">
        {loading ? (
          <div className="glass-card p-8 text-center text-slate-400 text-sm italic bg-white border-slate-200 shadow-sm">Sincronizando...</div>
        ) : users.length === 0 ? (
          <div className="glass-card p-8 text-center text-slate-400 text-sm italic bg-white border-slate-200 shadow-sm">Nenhum usuário encontrado.</div>
        ) : users.map((user, i) => (
          <motion.div 
            key={user.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card p-4 bg-white border-slate-200 shadow-sm space-y-3"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-900 font-black text-sm shrink-0">
                {(user.name || 'U')[0].toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <button
                  onClick={() => openUserDetail(user)}
                  className="text-sm font-bold text-slate-900 leading-tight truncate text-left hover:text-primary transition-colors cursor-pointer"
                >
                  {user.name}
                </button>
                <p className="text-[10px] text-slate-400 truncate">{user.email && user.email !== 'N/A' ? user.email : 'Sem e-mail'}</p>
              </div>
              <button 
                onClick={() => { setEditingUser({...user}); setIsModalOpen(true); }}
                className="p-1.5 text-slate-400 rounded-lg active:bg-slate-100 shrink-0"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
               <div>
                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Documento</p>
                 <p className="text-xs font-bold text-slate-600 font-mono">{formatCpfCnpj(user.cpfCnpj)}</p>
               </div>
               <div>
                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Contato</p>
                 <p className="text-xs font-bold text-slate-600">{formatPhone(user.phone)}</p>
               </div>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(user.role || 'TENANT').split(',').map((r: string) => (
                <span key={r} className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100">
                   <Shield className={`w-2.5 h-2.5 ${r === 'ADMIN' ? 'text-rose-500' : 'text-primary'}`} />
                   {r === 'ADMIN' ? 'Admin' : (r === 'OWNER' || r === 'LANDLORD' ? 'Proprietário' : 'Inquilino')}
                </span>
              ))}
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-3 border-t border-slate-50">
              {isProprietario(user.role) && (
                <button 
                  onClick={() => handleEditProperties(user)}
                  className="flex flex-col items-center justify-center gap-0.5 py-2.5 bg-slate-900 text-[#FFC107] rounded-lg transition-all active:scale-95"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span className="text-[7px] font-bold uppercase tracking-wider">Imóveis</span>
                </button>
              )}
              <button 
                onClick={() => { 
                  setDocUser(user); 
                  setIsDocModalOpen(true); 
                  setDocModalType('CONTRACT');
                  setDocForm({ name: 'Contrato de Locação', visibility: 'ALL', type: 'CONTRACT_LEASE', address: '' }); 
                  loadUserDocs(user.id); 
                  if (isProprietario(user.role)) {
                    loadPropertiesForDoc(user.id);
                  } else {
                    setPropertiesForDoc([]);
                  }
                }}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 bg-primary/10 text-primary rounded-lg transition-all active:scale-95"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="text-[7px] font-bold uppercase tracking-wider">Contrato</span>
              </button>
              <button 
                onClick={() => { 
                  setDocUser(user); 
                  setIsDocModalOpen(true); 
                  setDocModalType('DOCUMENT');
                  setDocForm({ name: '', visibility: 'ALL', type: 'DOCUMENT', address: '' }); 
                  loadUserDocs(user.id); 
                  if (isProprietario(user.role)) {
                    loadPropertiesForDoc(user.id);
                  } else {
                    setPropertiesForDoc([]);
                  }
                }}
                className="flex flex-col items-center justify-center gap-0.5 py-2.5 bg-slate-50 text-slate-400 rounded-lg transition-all active:scale-95 border border-slate-100"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span className="text-[7px] font-bold uppercase tracking-wider">Arquivos</span>
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Mobile Pagination */}
      <div className="sm:hidden">
        {!loading && pagination && totalPages > 1 && (
          <div className="flex items-center justify-between pt-3">
            <p className="text-[9px] text-slate-400 font-bold">{page + 1}/{totalPages}</p>
            <div className="flex items-center gap-1.5">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 active:scale-90">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {getPageNumbers().slice(0, 3).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-bold ${page === p ? 'bg-primary text-white' : 'bg-white border border-slate-100 text-slate-400'}`}>
                  {p + 1}
                </button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="w-9 h-9 flex items-center justify-center bg-white border border-slate-200 rounded-lg text-slate-400 disabled:opacity-30 active:scale-90">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden sm:block glass-card overflow-hidden bg-white shadow-sm border-slate-200 rounded-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/30">
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Usuário / E-mail</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">CPF/CNPJ</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Telefone</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest">Cargos</th>
                <th className="p-5 text-slate-400 font-bold text-[10px] uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium italic">Sincronizando usuários...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={5} className="p-10 text-center text-slate-400 font-medium italic">Nenhum usuário encontrado.</td></tr>
              ) : users.map((user, i) => (
                <motion.tr 
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-sm shrink-0 border border-slate-200 group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-all">
                        {(user.name || 'U')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="text-slate-900 font-black text-sm leading-tight flex items-center gap-2">
                          <button
                            onClick={() => openUserDetail(user)}
                            className="hover:text-primary transition-colors cursor-pointer text-left"
                            title="Ver cadastro e boletos"
                          >
                            {user.name}
                          </button>
                          {user.isLocalOverride && <span className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-black uppercase tracking-widest border border-primary/20">Dashboard</span>}
                        </div>
                        <div className="text-slate-500 text-[11px] font-medium flex items-center gap-1.5 mt-1">
                          <Mail className="w-3.5 h-3.5 text-slate-300" />
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="p-5 text-slate-600 font-mono text-xs tracking-tight">{formatCpfCnpj(user.cpfCnpj)}</td>
                  <td className="p-5 text-slate-600 font-medium text-xs">{formatPhone(user.phone)}</td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1.5">
                      {(user.role || 'TENANT').split(',').map((r: string) => (
                        <div key={r} className="flex items-center gap-1.5 text-slate-500 text-[9px] font-black uppercase tracking-widest bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <Shield className={`w-3 h-3 ${r === 'ADMIN' ? 'text-rose-500' : 'text-slate-400'}`} />
                          {r === 'ADMIN' ? 'Admin' : (r === 'OWNER' || r === 'LANDLORD' ? 'Proprietário' : 'Inquilino')}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex items-center justify-end gap-2.5">
                      {isProprietario(user.role) && (
                        <button 
                          onClick={() => handleEditProperties(user)}
                          className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 text-[#FFC107] hover:bg-black rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-md cursor-pointer active:scale-95"
                        >
                          <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          Imóveis
                        </button>
                      )}
                      <button 
                        onClick={() => { 
                          setDocUser(user); 
                          setIsDocModalOpen(true); 
                          setDocModalType('CONTRACT');
                          setDocForm({ name: 'Contrato de Locação', visibility: 'ALL', type: 'CONTRACT_LEASE', address: '' }); 
                          loadUserDocs(user.id); 
                          if (isProprietario(user.role)) {
                            loadPropertiesForDoc(user.id);
                          } else {
                            setPropertiesForDoc([]);
                          }
                        }}
                        className="flex items-center gap-2 px-3.5 py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest group shadow-sm cursor-pointer active:scale-95"
                      >
                        <FileText className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        Contrato
                      </button>
                      <button 
                        onClick={() => { 
                          setDocUser(user); 
                          setIsDocModalOpen(true); 
                          setDocModalType('DOCUMENT');
                          setDocForm({ name: '', visibility: 'ALL', type: 'DOCUMENT', address: '' }); 
                          loadUserDocs(user.id); 
                          if (isProprietario(user.role)) {
                            loadPropertiesForDoc(user.id);
                          } else {
                            setPropertiesForDoc([]);
                          }
                        }}
                        className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Anexar Documentos"
                      >
                        <FilePlus className="w-4.5 h-4.5" />
                      </button>
                      <button 
                        onClick={() => { setEditingUser({...user}); setIsModalOpen(true); }}
                        className="p-2.5 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Editar Perfil"
                      >
                        <MoreVertical className="w-4.5 h-4.5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && pagination && totalPages > 1 && (
          <div className="p-4 border-t border-slate-50 flex items-center justify-between bg-slate-50/50">
            <p className="text-xs text-slate-500 font-medium">Mostrando {users.length} de {pagination.total} usuários</p>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-1">
                {getPageNumbers().map(p => (
                  <button 
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all cursor-pointer ${
                      page === p ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-slate-400 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {p + 1}
                  </button>
                ))}
              </div>

              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 text-slate-400 hover:text-slate-900 disabled:opacity-30 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Novo Proprietário Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsCreateModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Novo Proprietário</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cadastro Manual (Não Sincronizado Asaas)</p>
                </div>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-8 overflow-y-auto space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                    <input 
                      type="text" value={newUserForm.name}
                      onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                      placeholder="Ex: João Silva da Costa"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail <span className="text-slate-300 normal-case">(opcional)</span></label>
                    <input
                      type="email" value={newUserForm.email}
                      onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                      placeholder="joao.silva@exemplo.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CPF</label>
                    <input
                      type="text" value={formatCPF(newUserForm.cpf)} inputMode="numeric"
                      onChange={(e) => setNewUserForm({...newUserForm, cpf: onlyDigits(e.target.value).slice(0, 11)})}
                      placeholder="000.000.000-00"
                      className={`w-full bg-slate-50 border rounded-xl py-3 px-4 text-slate-900 text-sm outline-none transition-all ${
                        cpfCheck.status === 'exists' ? 'border-rose-400 focus:border-rose-500'
                        : cpfCheck.status === 'free' ? 'border-emerald-300 focus:border-emerald-400'
                        : 'border-slate-200 focus:border-primary/50'
                      }`}
                    />
                    {cpfCheck.status === 'checking' && <p className="text-[10px] text-slate-400 font-medium ml-1">Verificando CPF…</p>}
                    {cpfCheck.status === 'exists' && (
                      <p className="text-[10px] text-rose-500 font-bold ml-1">
                        ⚠ Já cadastrado{cpfCheck.name ? `: ${cpfCheck.name}` : ''}{cpfCheck.source === 'asaas' ? ' (Asaas)' : ''}
                      </p>
                    )}
                    {cpfCheck.status === 'free' && <p className="text-[10px] text-emerald-600 font-bold ml-1">✓ CPF disponível</p>}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone <span className="text-slate-300 normal-case">(opcional)</span></label>
                    <input
                      type="text" value={maskPhone(newUserForm.phone)} inputMode="numeric"
                      onChange={(e) => setNewUserForm({...newUserForm, phone: onlyDigits(e.target.value).slice(0, 11)})}
                      placeholder="(00) 00000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-4">
                   <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest ml-1">Imóveis do Proprietário</label>
                      <button 
                        onClick={() => {
                          const props = (newUserForm as any).properties || [];
                          setNewUserForm({...newUserForm, properties: [...props, { address: '', neighborhood: '', city: '', state: 'RJ' }] } as any);
                        }}
                        className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                   </div>
                   
                   <div className="space-y-3">
                      {((newUserForm as any).properties || []).map((prop: any, idx: number) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl space-y-3 relative group">
                           <button 
                            onClick={() => {
                              const props = [...(newUserForm as any).properties];
                              props.splice(idx, 1);
                              setNewUserForm({...newUserForm, properties: props } as any);
                            }}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                           >
                              <X className="w-3 h-3" />
                           </button>
                           <input 
                              type="text" value={prop.address}
                              onChange={(e) => {
                                const props = [...(newUserForm as any).properties];
                                props[idx].address = e.target.value;
                                setNewUserForm({...newUserForm, properties: props } as any);
                              }}
                              placeholder="Endereço Completo"
                              className="w-full bg-transparent border-b border-slate-200 py-1 text-slate-900 text-xs outline-none focus:border-primary/50"
                           />
                           <div className="grid grid-cols-2 gap-3">
                              <input 
                                type="text" value={prop.neighborhood}
                                onChange={(e) => {
                                  const props = [...(newUserForm as any).properties];
                                  props[idx].neighborhood = e.target.value;
                                  setNewUserForm({...newUserForm, properties: props } as any);
                                }}
                                placeholder="Bairro"
                                className="w-full bg-transparent border-b border-slate-200 py-1 text-slate-900 text-xs outline-none focus:border-primary/50"
                              />
                              <input 
                                type="text" value={prop.city}
                                onChange={(e) => {
                                  const props = [...(newUserForm as any).properties];
                                  props[idx].city = e.target.value;
                                  setNewUserForm({...newUserForm, properties: props } as any);
                                }}
                                placeholder="Cidade"
                                className="w-full bg-transparent border-b border-slate-200 py-1 text-slate-900 text-xs outline-none focus:border-primary/50"
                              />
                           </div>
                        </div>
                      ))}
                      
                      {((newUserForm as any).properties || []).length === 0 && (
                        <p className="text-center py-4 text-slate-400 text-[10px] uppercase font-bold italic">Nenhum imóvel adicionado</p>
                      )}
                   </div>
                </div>
                
                <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex items-center gap-3">
                   <Shield className="w-5 h-5 text-amber-500 shrink-0" />
                   <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                     A senha não é necessária agora. O proprietário definirá sua própria senha durante o **primeiro acesso** ao portal.
                   </p>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setIsCreateModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-bold cursor-pointer">Cancelar</button>
                <button
                  onClick={handleCreateUser} disabled={isSaving || cpfCheck.status === 'exists'}
                  className="yellow-button px-8 py-3 rounded-xl shadow-xl shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-xs"
                >
                  {isSaving ? 'Criando...' : 'Criar Proprietário'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit User Profile Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Editar Perfil</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronização Dashboard vs Asaas</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome Completo</label>
                  <input
                    type="text" value={editingUser?.name || ''}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">E-mail</label>
                  <input
                    type="email"
                    value={editingUser?.email && editingUser.email !== 'N/A' ? editingUser.email : ''}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    placeholder="email@exemplo.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Telefone</label>
                  <input
                    type="text" value={formatPhone(editingUser?.phone || '')}
                    onChange={(e) => setEditingUser({...editingUser, phone: e.target.value.replace(/\D/g, '').slice(0, 11)})}
                    placeholder="(00) 00000-0000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cargo e Acesso (Múltiplos permitidos)</label>
                  <div className="grid grid-cols-3 gap-2">
                    {roles.map((r) => (
                      <button
                        key={r.value} onClick={() => toggleRole(r.value)}
                        className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer ${
                          (editingUser?.role || '').split(',').includes(r.value)
                            ? 'bg-primary/10 border-primary/50 text-primary shadow-lg shadow-primary/5 font-black' 
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-bold cursor-pointer">Cancelar</button>
                <button 
                  onClick={handleSave} disabled={isSaving}
                  className="yellow-button px-8 py-3 rounded-xl shadow-xl shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-xs"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attach Document Modal */}
      <AnimatePresence>
        {isDocModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsDocModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">{docModalType === 'CONTRACT' ? 'Contratos' : 'Documentos'} de {docUser?.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{docModalType === 'CONTRACT' ? 'Gestão de Contratos Digitais' : 'Gestão de Arquivos Anexados'}</p>
                </div>
                <button onClick={() => setIsDocModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-8">
                {/* Upload Section */}
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                    <FilePlus className="w-4 h-4 text-primary" />
                    Novo {docModalType === 'CONTRACT' ? 'Contrato' : 'Anexo'}
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nome do Documento</label>
                      <input 
                        type="text" value={docForm.name}
                        onChange={(e) => setDocForm({...docForm, name: e.target.value})}
                        placeholder="Ex: Contrato de Locação, RG, etc"
                        className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Documento</label>
                      <div className="relative" ref={typeDropdownRef}>
                        <button 
                          onClick={() => setIsTypeDropdownOpen(!isTypeDropdownOpen)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>{docTypes.find(t => t.value === docForm.type)?.label || 'Selecionar Tipo'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isTypeDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isTypeDropdownOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                              className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                            >
                              <style>{`
                                .scrollbar-hide::-webkit-scrollbar { display: none; }
                                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
                              `}</style>
                              <div className="max-h-60 overflow-y-auto scrollbar-hide">
                                {docTypes.filter(t => {
                                  if (docModalType === 'CONTRACT') return t.value.startsWith('CONTRACT');
                                  return !t.value.startsWith('CONTRACT');
                                }).map((type) => (
                                  <button
                                    key={type.value}
                                    onClick={() => {
                                      setDocForm({ ...docForm, type: type.value, name: type.label });
                                      setIsTypeDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-between group border-b border-slate-50 last:border-0"
                                  >
                                    {type.label}
                                    {docForm.type === type.value && <Check className="w-4 h-4 text-primary" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Visível Para</label>
                      <div className="relative" ref={visibilityDropdownRef}>
                        <button 
                          onClick={() => setIsVisibilityDropdownOpen(!isVisibilityDropdownOpen)}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all flex items-center justify-between cursor-pointer"
                        >
                          <span>{visibilityOptions.find(o => o.value === docForm.visibility)?.label || 'Todos os Portais'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${isVisibilityDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {isVisibilityDropdownOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                              className="absolute z-[60] left-0 right-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                            >
                              <div className="max-h-60 overflow-y-auto scrollbar-hide">
                                {visibilityOptions.map((opt) => (
                                  <button
                                    key={opt.value}
                                    onClick={() => {
                                      setDocForm({ ...docForm, visibility: opt.value });
                                      setIsVisibilityDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-4 py-3 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-all flex items-center justify-between group border-b border-slate-50 last:border-0"
                                  >
                                    {opt.label}
                                    {docForm.visibility === opt.value && <Check className="w-4 h-4 text-primary" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {isProprietario(docUser?.role) && docForm.type.startsWith('CONTRACT') && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Imóvel Vinculado</label>
                        <select
                          value={docForm.address || ''}
                          onChange={(e) => setDocForm({ ...docForm, address: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all cursor-pointer"
                        >
                          <option value="">Não vincular a nenhum imóvel</option>
                          {propertiesForDoc.map((prop: any) => {
                            const fullAddr = [prop.address, prop.number, prop.complement, prop.neighborhood, prop.city, prop.state]
                              .filter(Boolean)
                              .join(', ');
                            return (
                              <option key={prop.id} value={fullAddr}>
                                {fullAddr}
                              </option>
                            );
                          })}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Arquivo</label>
                    <div className="relative">
                      <input 
                        type="file" 
                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                        className="hidden" id="file-upload"
                      />
                      <label 
                        htmlFor="file-upload"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl p-8 hover:border-primary/30 transition-all cursor-pointer group"
                      >
                        <FileUp className="w-8 h-8 text-slate-400 group-hover:text-primary transition-colors mb-2" />
                        <span className="text-sm font-medium text-slate-600 group-hover:text-slate-900 transition-colors text-center px-4">
                          {selectedFile ? selectedFile.name : 'Clique para selecionar arquivo'}
                        </span>
                        <span className="text-[10px] text-slate-400 mt-1 uppercase font-black tracking-widest">PDF, JPG, PNG até 10MB</span>
                      </label>
                    </div>
                  </div>

                  <button 
                    disabled={docUploading || (!selectedFile && !editingDocId) || !docForm.name}
                    onClick={handleUploadDoc}
                    className="yellow-button w-full py-4 rounded-2xl shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale"
                  >
                    {docUploading ? 'Processando...' : (editingDocId ? 'Salvar Alterações' : (docModalType === 'CONTRACT' ? 'Anexar Contrato' : 'Anexar Agora'))}
                  </button>

                  {editingDocId && (
                    <button 
                      onClick={() => {
                        setEditingDocId(null);
                        setDocForm({ name: '', visibility: 'ALL', type: 'CONTRACT_LEASE', address: '' });
                        setSelectedFile(null);
                      }}
                      className="w-full py-3 bg-slate-100 text-slate-500 hover:text-slate-900 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                    >
                      Cancelar Edição
                    </button>
                  )}
                </div>

                {/* Docs List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {docModalType === 'CONTRACT' ? 'Contratos Atuais' : 'Arquivos Atuais'}
                    </h3>
                  </div>
                  
                  <div className="space-y-3">
                    {userDocs.filter(d => docModalType === 'CONTRACT' ? d.type.startsWith('CONTRACT') : !d.type.startsWith('CONTRACT')).length === 0 ? (
                      <p className="text-center py-10 text-slate-400 text-sm italic font-medium">Nenhum {docModalType === 'CONTRACT' ? 'contrato' : 'documento'} anexado ainda.</p>
                    ) : userDocs.filter(d => docModalType === 'CONTRACT' ? d.type.startsWith('CONTRACT') : !d.type.startsWith('CONTRACT')).map((doc) => (
                      <div key={doc.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between group hover:border-primary/20 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                             <FileText className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 leading-tight">{doc.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                {new Date(doc.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                              <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border ${
                                doc.visibility === 'TENANT' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                                doc.visibility === 'LANDLORD' ? 'bg-blue-500/10 text-blue-600 border-blue-500/20' :
                                'bg-slate-500/10 text-slate-500 border-slate-500/20'
                              }`}>
                                {doc.visibility === 'ALL' ? 'Público' : (doc.visibility === 'TENANT' ? 'Inquilino' : 'Proprietário')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <a
                            href={getAssetUrl(doc.url)} target="_blank" rel="noopener noreferrer"
                            className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all"
                            title="Visualizar"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                          <button 
                            onClick={() => handleEditDoc(doc)}
                            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-all cursor-pointer"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsDocModalOpen(false)} className="px-8 py-3 bg-slate-900 text-[#FFC107] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all cursor-pointer">Fechar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Edit User Properties Modal */}
      <AnimatePresence>
        {isPropertyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsPropertyModalOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Imóveis de {propertyUser?.name}</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gestão de Patrimônio do Proprietário</p>
                </div>
                <button onClick={() => setIsPropertyModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900 cursor-pointer"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6">
                 <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <Home className="w-4 h-4 text-primary" />
                       Lista de Imóveis
                    </h3>
                    <button 
                      onClick={() => setUserProperties([...userProperties, { address: '', neighborhood: '', city: '', state: 'RJ' }])}
                      className="p-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg transition-all"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                 </div>

                 <div className="space-y-4">
                    {userProperties.length === 0 ? (
                      <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                         <Home className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                         <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Nenhum imóvel vinculado</p>
                      </div>
                    ) : userProperties.map((prop, idx) => (
                      <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 relative group hover:border-primary/20 transition-all">
                         <button 
                          onClick={() => {
                            const newProps = [...userProperties];
                            newProps.splice(idx, 1);
                            setUserProperties(newProps);
                          }}
                          className="absolute -top-2 -right-2 w-7 h-7 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xl z-10"
                         >
                            <X className="w-4 h-4" />
                         </button>
                         
                         <div className="space-y-1">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço Completo</label>
                            <input 
                              type="text" value={prop.address}
                              onChange={(e) => {
                                const newProps = [...userProperties];
                                newProps[idx].address = e.target.value;
                                setUserProperties(newProps);
                              }}
                              placeholder="Ex: Rua das Flores, 123"
                              className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-900 text-xs focus:border-primary/50 outline-none transition-all"
                            />
                         </div>
                         
                         <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Bairro</label>
                               <input 
                                  type="text" value={prop.neighborhood}
                                  onChange={(e) => {
                                    const newProps = [...userProperties];
                                    newProps[idx].neighborhood = e.target.value;
                                    setUserProperties(newProps);
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-900 text-xs focus:border-primary/50 outline-none transition-all"
                               />
                            </div>
                            <div className="space-y-1">
                               <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cidade</label>
                               <input 
                                  type="text" value={prop.city}
                                  onChange={(e) => {
                                    const newProps = [...userProperties];
                                    newProps[idx].city = e.target.value;
                                    setUserProperties(newProps);
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-2 px-3 text-slate-900 text-xs focus:border-primary/50 outline-none transition-all"
                               />
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                <button onClick={() => setIsPropertyModalOpen(false)} className="px-6 py-2 text-slate-400 hover:text-slate-900 transition-colors text-sm font-bold cursor-pointer">Cancelar</button>
                <button 
                  onClick={handleSaveProperties} disabled={isSaving}
                  className="yellow-button px-8 py-3 rounded-xl shadow-xl shadow-primary/20 disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed text-xs"
                >
                  {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <UserDetailModal
        userId={detailUser?.id || null}
        userName={detailUser?.name}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
      />
    </div>
  );
}
