'use client';
// Trigger build to pick up backend fixes

import { 
  Settings, 
  Shield, 
  Bell, 
  CreditCard, 
  Palette, 
  Globe, 
  Save, 
  Image as ImageIcon,
  Type,
  Layout,
  Link as LinkIcon,
  Plus,
      RefreshCw,
  Trash2,
  ExternalLink,
  Moon,
  Sun,
  LayoutDashboard,
  RotateCcw,
  FileText,
  ChevronRight,
  Eye,
  Check,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useBranding } from '@/components/BrandingProvider';
import { toast } from 'react-hot-toast';
import ConfirmModal from '@/components/ConfirmModal';

const DEFAULT_SETTINGS = {
  name: 'SLX Imobiliária',
  logoUrl: '',
  primaryColor: '#FACC15',
  secondaryColor: '#000000',
  config: {
    theme: 'light',
    sidebarColor: '#0a0c10',
    textColor: '#FFFFFF',
    welcomeMessage: 'Bem-vindo ao Painel SLX',
    dashboard: {
      showBalance: true,
      showStats: true,
      showDocs: true,
      showQuickActions: true
    },
    quickLinks: [] as any[]
  }
};

export default function SettingsPage() {
  const { branding: globalBranding, refreshBranding } = useBranding();
  const [activeTab, setActiveTab] = useState('Aparência');
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
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

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  useEffect(() => {
    if (globalBranding) {
      const config = globalBranding.config || {};
      setSettings({
        ...globalBranding,
        config: {
          ...DEFAULT_SETTINGS.config,
          ...config,
          dashboard: config.dashboard || DEFAULT_SETTINGS.config.dashboard,
          quickLinks: config.quickLinks || []
        }
      });
      setLoading(false);
    }
  }, [globalBranding]);

  // Live Preview
  useEffect(() => {
    if (!loading) {
      const root = document.documentElement;
      root.style.setProperty('--primary', settings.primaryColor);
      root.style.setProperty('--secondary', settings.secondaryColor);
      root.style.setProperty('--sidebar-bg', settings.config.sidebarColor);
      root.style.setProperty('--text-main', settings.config.textColor);
      
      if (settings.config.theme === 'light') root.classList.add('light');
      else root.classList.remove('light');
    }
  }, [settings.primaryColor, settings.secondaryColor, settings.config.sidebarColor, settings.config.textColor, settings.config.theme, loading]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await fetchApi('/settings/branding', {
        method: 'PUT',
        body: JSON.stringify(settings)
      });
      await refreshBranding();
      toast.success('Configurações salvas com sucesso!');
    } catch (error: any) {
      toast.error(`Erro: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const revertToDefault = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Restaurar Padrões',
      message: 'Deseja restaurar as configurações padrão? Isso mudará o visual para o tema SLX original.',
      onConfirm: () => {
        setSettings(DEFAULT_SETTINGS);
        toast.success('Configurações restauradas!');
      }
    });
  };

  const addQuickLink = () => {
    const newLink = { 
      id: Math.random().toString(36).substr(2, 9),
      label: 'Novo Link', 
      url: 'https://', 
      icon: 'ExternalLink' 
    };
    setSettings({
      ...settings,
      config: { ...settings.config, quickLinks: [...settings.config.quickLinks, newLink] }
    });
  };

  const removeQuickLink = (id: string) => {
    setSettings({
      ...settings,
      config: { ...settings.config, quickLinks: settings.config.quickLinks.filter(l => l.id !== id) }
    });
  };

  const updateQuickLink = (id: string, field: string, value: string) => {
    setSettings({
      ...settings,
      config: { ...settings.config, quickLinks: settings.config.quickLinks.map(l => l.id === id ? { ...l, [field]: value } : l) }
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto pb-32">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">Configurações do Painel</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Personalize a identidade visual e as funcionalidades da sua plataforma.</p>
        </div>
        <button 
          onClick={revertToDefault}
          className="flex items-center gap-2 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-transparent hover:border-rose-100"
        >
          <RotateCcw className="w-4 h-4" />
          Restaurar Padrões
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-3 space-y-2.5">
          {[
            { icon: Palette, label: 'Aparência' },
            { icon: LayoutDashboard, label: 'Dashboard' },
            { icon: LinkIcon, label: 'Ações Rápidas' },
            { icon: Globe, label: 'Integrações' },
            { icon: Shield, label: 'Segurança' },
          ].map((item, i) => (
            <button 
              key={i}
              onClick={() => setActiveTab(item.label)}
              className={cn(
                "w-full flex items-center justify-between px-6 py-4.5 rounded-[1.5rem] transition-all duration-300 font-black text-[10px] uppercase tracking-widest group shadow-sm",
                activeTab === item.label 
                  ? "bg-primary text-black shadow-xl shadow-primary/20" 
                  : "bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-900 border border-slate-100"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className={cn("w-4.5 h-4.5", activeTab === item.label ? "text-black" : "text-slate-300 group-hover:text-primary transition-colors")} />
                {item.label}
              </div>
              {activeTab === item.label && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-9">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white border border-slate-200 rounded-[2.5rem] p-10 space-y-12 shadow-sm"
            >
              {/* --- TAB: APARÊNCIA --- */}
              {activeTab === 'Aparência' && (
                <div className="space-y-12">
                  <section className="space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                       <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm">
                          <Palette className="w-6 h-6" />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">Identidade da Marca</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Nome, logo e tema nativo do painel</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome da Imobiliária</label>
                        <input 
                          type="text" 
                          value={settings.name}
                          onChange={(e) => setSettings({...settings, name: e.target.value})}
                          className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 text-sm font-medium focus:border-primary/50 outline-none transition-all shadow-sm" 
                        />
                      </div>
                      <div className="space-y-2.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tema Padrão do Sistema</label>
                        <div className="grid grid-cols-2 gap-4 p-1.5 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                           {[
                             { id: 'dark', label: 'Dark Mode', icon: Moon },
                             { id: 'light', label: 'Light Mode', icon: Sun }
                           ].map((t) => (
                             <button
                               key={t.id}
                               onClick={() => setSettings({...settings, config: {...settings.config, theme: t.id}})}
                               className={cn(
                                 "flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm",
                                 settings.config.theme === t.id ? "bg-primary text-black shadow-lg" : "text-slate-400 hover:text-slate-900 hover:bg-white"
                               )}
                             >
                               <t.icon className="w-4 h-4" />
                               {t.label}
                             </button>
                           ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Logo Oficial</label>
                      <div className="flex items-center gap-8 p-8 rounded-[2rem] bg-slate-50 border border-slate-200 shadow-inner group/logo">
                        <div className="w-28 h-28 rounded-2xl bg-white border border-slate-200 flex items-center justify-center p-5 shrink-0 relative group overflow-hidden shadow-xl shadow-slate-200/50">
                            {settings.logoUrl ? (
                              <img src={settings.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                            ) : (
                              <ImageIcon className="w-10 h-10 text-slate-200" />
                            )}
                            <label className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                              <Plus className="w-8 h-8 text-white" />
                              <input 
                                type="file" className="hidden" accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  const formData = new FormData();
                                  formData.append('logo', file);
                                  try {
                                    const res = await fetchApi('/settings/upload-logo', { method: 'POST', body: formData, headers: {} });
                                    setSettings({ ...settings, logoUrl: res.url });
                                  } catch (err: any) { toast.error(err.message); }
                                }}
                              />
                            </label>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-slate-900 font-bold text-lg leading-tight">Configuração de Logotipo</h4>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed max-w-sm">
                              Suba uma versão transparente (PNG/SVG) para uma exibição perfeita no sidebar escuro. 
                              <br/><span className="text-primary font-black uppercase tracking-widest mt-1 inline-block">Recomendado: 512x512px ou superior.</span>
                            </p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-8 pt-12 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm">
                          <Layout className="w-6 h-6" />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">Paleta de Cores</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Customize o design system da sua plataforma</p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                      {[
                        { label: 'Primária', key: 'primaryColor', desc: 'Botões e ícones' },
                        { label: 'Secundária', key: 'secondaryColor', desc: 'Destaques' },
                        { label: 'Sidebar', key: 'sidebarColor', isConfig: true, desc: 'Fundo lateral' },
                        { label: 'Textos', key: 'textColor', isConfig: true, desc: 'Títulos/Links' }
                      ].map((c) => (
                        <div key={c.label} className="space-y-4 group/color">
                          <div className="text-center space-y-1">
                            <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest block">{c.label}</label>
                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{c.desc}</p>
                          </div>
                          <div className="p-2 bg-white border border-slate-200 rounded-3xl shadow-sm hover:border-primary group-hover/color:shadow-lg transition-all duration-300 relative">
                            <input 
                              type="color" 
                              value={c.isConfig ? (settings.config as any)[c.key] : (settings as any)[c.key]}
                              onChange={(e) => {
                                if (c.isConfig) setSettings({...settings, config: {...settings.config, [c.key]: e.target.value}});
                                else setSettings({...settings, [c.key]: e.target.value});
                              }}
                              className="w-full h-20 rounded-2xl cursor-pointer bg-transparent border-none outline-none"
                            />
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center opacity-0 group-hover/color:opacity-100 transition-opacity">
                               <Check className="w-3 h-3 text-slate-900" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* --- TAB: DASHBOARD --- */}
              {activeTab === 'Dashboard' && (
                <div className="space-y-12">
                  <section className="space-y-8">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm">
                          <Type className="w-6 h-6" />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">Mensagem de Boas-vindas</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Título principal exibido ao entrar no painel</p>
                       </div>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Texto de Boas-vindas</label>
                      <input 
                        type="text" 
                        value={settings.config.welcomeMessage}
                        onChange={(e) => setSettings({...settings, config: {...settings.config, welcomeMessage: e.target.value}})}
                        className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 text-sm font-medium focus:border-primary/50 outline-none transition-all shadow-sm" 
                      />
                    </div>
                  </section>

                  <section className="space-y-8 pt-12 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                       <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm">
                          <LayoutDashboard className="w-6 h-6" />
                       </div>
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">Visibilidade dos Módulos</h2>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Escolha quais informações exibir no dashboard</p>
                       </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {[
                        { key: 'showBalance', label: 'Saldo em Carteira', icon: CreditCard, desc: 'Cartão de valores e saques' },
                        { key: 'showStats', label: 'Estatísticas Gerais', icon: LayoutDashboard, desc: 'Números e métricas de desempenho' },
                        { key: 'showDocs', label: 'Últimos Documentos', icon: FileText, desc: 'Acesso rápido aos arquivos' },
                        { key: 'showQuickActions', label: 'Ações Rápidas', icon: Plus, desc: 'Botões de atalho personalizados' },
                      ].map((mod) => (
                        <div key={mod.key} className="flex items-center justify-between p-6 rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:border-slate-300 transition-all">
                           <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                <mod.icon className="w-6 h-6" />
                              </div>
                              <div>
                                <span className="text-slate-900 font-bold text-sm block">{mod.label}</span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">{mod.desc}</span>
                              </div>
                           </div>
                           <button 
                             onClick={() => setSettings({
                               ...settings,
                               config: { ...settings.config, dashboard: { ...settings.config.dashboard, [mod.key]: !settings.config.dashboard[mod.key as keyof typeof settings.config.dashboard] } }
                             })}
                             className={cn(
                               "w-12 h-6 rounded-full transition-all relative shadow-inner",
                               settings.config.dashboard[mod.key as keyof typeof settings.config.dashboard] ? "bg-primary" : "bg-slate-200"
                             )}
                           >
                             <div className={cn(
                               "absolute top-1 w-4 h-4 rounded-full bg-white transition-all shadow-md border border-slate-100",
                               settings.config.dashboard[mod.key as keyof typeof settings.config.dashboard] ? "left-7" : "left-1"
                             )} />
                           </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* --- TAB: AÇÕES RÁPIDAS --- */}
              {activeTab === 'Ações Rápidas' && (
                <div className="space-y-10">
                  <section className="space-y-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-50">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl text-primary border border-primary/20 shadow-sm">
                           <LinkIcon className="w-6 h-6" />
                        </div>
                        <div>
                           <h2 className="text-xl font-bold text-slate-900">Atalhos Personalizados</h2>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Crie botões para acesso rápido a links externos</p>
                        </div>
                      </div>
                      <button 
                        onClick={addQuickLink}
                        className="bg-primary text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Atalho
                      </button>
                    </div>

                    <div className="space-y-6">
                      {settings.config.quickLinks?.length === 0 ? (
                        <div className="py-24 text-center space-y-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2.5rem]">
                          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-slate-100">
                             <LinkIcon className="w-8 h-8 text-slate-200" />
                          </div>
                          <p className="text-slate-400 font-medium max-w-xs mx-auto text-sm italic">Nenhum atalho configurado. Use os botões para acesso rápido a links externos.</p>
                        </div>
                      ) : settings.config.quickLinks.map((link) => (
                        <div key={link.id} className="grid grid-cols-1 md:grid-cols-12 gap-6 p-8 rounded-[2rem] bg-white border border-slate-200 items-end shadow-sm hover:shadow-md transition-all group">
                          <div className="md:col-span-4 space-y-2.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Botão</label>
                             <input 
                               type="text" value={link.label}
                               onChange={(e) => updateQuickLink(link.id, 'label', e.target.value)}
                               className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-6 text-slate-900 text-sm font-bold focus:border-primary outline-none transition-all shadow-inner"
                             />
                          </div>
                          <div className="md:col-span-6 space-y-2.5">
                             <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de Destino</label>
                             <div className="relative">
                               <ExternalLink className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                               <input 
                                 type="text" value={link.url}
                                 onChange={(e) => updateQuickLink(link.id, 'url', e.target.value)}
                                 className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 pl-12 pr-6 text-slate-900 text-sm font-medium focus:border-primary outline-none transition-all shadow-inner"
                               />
                             </div>
                          </div>
                          <div className="md:col-span-2 flex justify-end gap-2 pb-1">
                             <button onClick={() => removeQuickLink(link.id)} className="w-14 h-14 bg-rose-50 text-rose-300 hover:text-rose-500 hover:bg-rose-100 rounded-2xl transition-all flex items-center justify-center border border-rose-100/50">
                               <Trash2 className="w-5 h-5" />
                             </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              )}

              {/* --- TAB: INTEGRAÇÕES --- */}
              {activeTab === 'Integrações' && (
                <section className="space-y-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 p-10 rounded-[2.5rem] bg-slate-50 border border-slate-200">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                         <div className="p-3 bg-white rounded-2xl border border-slate-100 shadow-sm">
                            <Globe className="w-6 h-6 text-slate-900" />
                         </div>
                         <h2 className="text-xl font-bold text-slate-900">Integração Financeira (Asaas)</h2>
                      </div>
                      <p className="text-sm text-slate-500 font-medium max-w-md leading-relaxed">Sincronize automaticamente seus clientes, cobranças e notas fiscais diretamente da sua conta Asaas.</p>
                    </div>
                    <button 
                      onClick={async () => {
                        setIsSyncing(true);
                        try {
                          await fetchApi('/sync', { method: 'POST' });
                          toast.success('Sincronização concluída!');
                        } catch (e: any) { toast.error(e.message); }
                        finally { setIsSyncing(false); }
                      }}
                      disabled={isSyncing}
                      className={cn("yellow-button text-black px-10 py-5 rounded-3xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50", isSyncing && "animate-pulse")}
                    >
                      <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}
                    </button>
                  </div>
                </section>
              )}

              {/* SAVE BUTTON FOOTER */}
              <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-3 text-slate-400">
                   <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm shadow-emerald-500/50"></div>
                   <span className="text-[9px] font-black uppercase tracking-[0.2em]">Configurações da Imobiliária</span>
                </div>
                <button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="yellow-button text-black px-14 py-5 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-4 disabled:opacity-50"
                >
                  <Save className="w-5.5 h-5.5" />
                  {isSaving ? 'Salvando...' : 'Salvar e Aplicar Alterações'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <ConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}
