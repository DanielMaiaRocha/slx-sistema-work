'use client';

import { 
  ClipboardCheck, 
  Save, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Image as ImageIcon,
  Video,
  ChevronDown,
  ChevronUp,
  MapPin,
  User,
  Building,
  CheckCircle2,
  Circle,
  AlertCircle,
  Search,
  Calendar,
  X,
  Filter,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';
import ImagePreviewModal from '@/components/ImagePreviewModal';

interface Room {
  id: string;
  name: string;
  items: { 
    id: string; 
    description: string; 
    status: string;
    observations?: string;
    videoUrl?: string;
    photos?: string[];
  }[];
  photos: string[];
  videos: string[];
  isExpanded?: boolean;
}

export default function NewInspectionPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isTypeOpen, setIsTypeOpen] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<Record<string, File[]>>({});
  const [videoFiles, setVideoFiles] = useState<Record<string, File[]>>({});
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const propertyTypes = [
    { value: 'RESIDENTIAL', label: 'Residencial' },
    { value: 'COMMERCIAL', label: 'Comercial' },
    { value: 'INDUSTRIAL', label: 'Industrial' },
  ];
  
  // Form State
  const [formData, setFormData] = useState({
    propertyAddress: '',
    propertyNumber: '',
    propertyType: 'RESIDENTIAL',
    landlordData: { name: '', cpf: '', rg: '', profession: '' },
    tenantData: { name: '', cpf: '', rg: '', profession: '' },
    inspectorData: { name: '', creci: '', cpf: '' },
    date: new Date().toISOString().split('T')[0],
    cep: '',
  });

  const formatCEP = (cep: string) => {
    return cep.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 9);
  };

  const formatCPFCNPJ = (value: string) => {
    const val = value.replace(/\D/g, '');
    if (val.length <= 11) {
      return val.replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})/, '$1-$2')
        .substring(0, 14);
    } else {
      return val.replace(/(\d{2})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1/$2')
        .replace(/(\d{4})(\d{1,2})/, '$1-$2')
        .substring(0, 18);
    }
  };

  const formatRG = (rg: string) => {
    return rg.replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1})/, '$1-$2')
      .substring(0, 12);
  };

  const handleCEPChange = async (cep: string) => {
    const formatted = formatCEP(cep);
    const cleanCEP = formatted.replace(/\D/g, '');
    setFormData(prev => ({ ...prev, cep: formatted }));

    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          const fullAddress = `${data.logradouro}, ${data.bairro}, ${data.localidade} - ${data.uf}`;
          setFormData(prev => ({ ...prev, propertyAddress: fullAddress }));
          toast.success('Endereço preenchido automaticamente!');
        } else {
          toast.error('CEP não encontrado.');
        }
      } catch (error) {
        toast.error('Erro ao buscar CEP.');
      }
    }
  };

  const [rooms, setRooms] = useState<Room[]>([
    { 
      id: 'r1', 
      name: 'Sala de Estar', 
      isExpanded: true,
      items: [{ 
        id: 'i1', 
        description: 'Piso: Porcelanato em ótimo estado', 
        status: 'BOM',
        observations: '',
        videoUrl: ''
      }],
      photos: [],
      videos: []
    }
  ]);

  const [isLoaded, setIsLoaded] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    const draft = localStorage.getItem('inspection_draft');
    if (draft && !isLoaded) {
      try {
        const { formData: savedFormData, rooms: savedRooms, step: savedStep } = JSON.parse(draft);
        if (savedFormData) setFormData(savedFormData);
        if (savedRooms) setRooms(savedRooms);
        if (savedStep) setStep(savedStep);
        toast.success('Rascunho recuperado automaticamente!', { id: 'draft-loaded', icon: '📝' });
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
    setIsLoaded(true);
  }, [isLoaded]);

  const resetForm = () => {
    setConfirmConfig({
      isOpen: true,
      title: 'Limpar Formulário',
      message: 'Deseja realmente limpar todo o formulário e começar do zero? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        localStorage.removeItem('inspection_draft');
        setFormData({
          propertyAddress: '',
          propertyNumber: '',
          propertyType: 'RESIDENTIAL',
          landlordData: { name: '', cpf: '', rg: '', profession: '' },
          tenantData: { name: '', cpf: '', rg: '', profession: '' },
          inspectorData: { name: '', creci: '', cpf: '' },
          date: new Date().toISOString().split('T')[0],
          cep: '',
        });
        setRooms([
          { 
            id: 'r1', 
            name: 'Sala de Estar', 
            isExpanded: true,
            items: [{ 
            id: 'i1', 
            description: 'Piso: Porcelanato em ótimo estado', 
            status: 'BOM',
            observations: '',
            videoUrl: ''
          }],
            photos: [],
            videos: []
          }
        ]);
        setStep(1);
        toast.success('Formulário limpo!');
      }
    });
  };

  // Save draft to localStorage whenever state changes
  useEffect(() => {
    if (!isLoaded) return; 
    const draft = JSON.stringify({ formData, rooms, step });
    localStorage.setItem('inspection_draft', draft);
  }, [formData, rooms, step, isLoaded]);

  const addRoom = () => {
    setRooms([...rooms, { 
      id: Math.random().toString(36).substr(2, 9), 
      name: 'Novo Cômodo', 
      isExpanded: true,
      items: [],
      photos: [],
      videos: []
    }]);
  };

  const removeRoom = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remover Cômodo',
      message: 'Deseja remover este cômodo e todas as suas observações? Esta ação não pode ser desfeita.',
      onConfirm: () => {
        setRooms(rooms.filter(r => r.id !== id));
      }
    });
  };

  const addItem = (roomId: string) => {
    setRooms(rooms.map(r => r.id === roomId ? {
      ...r,
      items: [...r.items, { 
        id: Math.random().toString(36).substr(2, 9), 
        description: '', 
        status: 'BOM',
        observations: '',
        videoUrl: ''
      }]
    } : r));
  };

  const updateItem = (roomId: string, itemId: string, field: string, value: string) => {
    setRooms(rooms.map(r => r.id === roomId ? {
      ...r,
      items: r.items.map(i => i.id === itemId ? { ...i, [field]: value } : i)
    } : r));
  };

  const removeItem = (roomId: string, itemId: string) => {
    setRooms(rooms.map(r => r.id === roomId ? {
      ...r,
      items: r.items.filter(i => i.id !== itemId)
    } : r));
  };

  const handlePhotoUpload = (roomId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileList = Array.from(files);
    const newPreviewUrls = fileList.map(file => URL.createObjectURL(file));
    
    setRooms(rooms.map(r => r.id === roomId ? {
      ...r,
      photos: [...r.photos, ...newPreviewUrls]
    } : r));

    setPhotoFiles(prev => ({
      ...prev,
      [roomId]: [...(prev[roomId] || []), ...fileList]
    }));
  };

  const removePhoto = (roomId: string, photoUrl: string) => {
    setRooms(rooms.map(r => r.id === roomId ? {
      ...r,
      photos: r.photos.filter(p => p !== photoUrl)
    } : r));
  };

  const handleSave = async () => {
    if (!formData.propertyAddress) {
      toast.error('O endereço da propriedade é obrigatório.');
      return;
    }
    setIsSaving(true);
    try {
      const inspection = await fetchApi('/inspections', {
        method: 'POST',
        body: JSON.stringify({ ...formData, status: 'FINALIZED' })
      });

      for (const room of rooms) {
        const roomData = await fetchApi(`/inspections/${inspection.id}/rooms`, {
          method: 'POST',
          body: JSON.stringify({ name: room.name, order: 0 })
        });

        for (const item of room.items) {
          const itemData = await fetchApi(`/inspections/rooms/${roomData.id}/items`, {
            method: 'POST',
            body: JSON.stringify({ 
              description: item.description, 
              status: item.status,
              observations: item.observations,
              videoUrl: item.videoUrl
            })
          });

          const itemFiles = photoFiles[`item-${item.id}`] || [];
          for (const file of itemFiles) {
            const photoFormData = new FormData();
            photoFormData.append('photo', file);
            photoFormData.append('itemId', itemData.id);
            await fetchApi(`/inspections/rooms/${roomData.id}/photos`, { method: 'POST', body: photoFormData });
          }

          const itemVideos = videoFiles[`item-${item.id}`] || [];
          for (const file of itemVideos) {
            const videoFormData = new FormData();
            videoFormData.append('video', file);
            videoFormData.append('itemId', itemData.id);
            await fetchApi(`/inspections/rooms/${roomData.id}/videos`, { method: 'POST', body: videoFormData });
          }
        }

        const filesToUpload = photoFiles[room.id] || [];
        for (const file of filesToUpload) {
          const photoFormData = new FormData();
          photoFormData.append('photo', file);
          
          await fetchApi(`/inspections/rooms/${roomData.id}/photos`, {
            method: 'POST',
            body: photoFormData
          });
        }
      }

      toast.success('Vistoria salva com sucesso!');
      localStorage.removeItem('inspection_draft');
      router.push(`/dashboard/inspections/${inspection.id}`);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full py-4 sm:py-8 space-y-5 sm:space-y-8 pb-32">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center justify-between w-full sm:w-auto gap-6">
          <Link href="/dashboard/inspections" className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors">
            <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Voltar</span>
          </Link>
          <button 
            onClick={resetForm}
            className="text-[10px] font-black uppercase tracking-widest text-rose-400 hover:text-rose-600 transition-colors flex items-center gap-1.5 p-2 hover:bg-rose-50 rounded-xl"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Limpar Rascunho</span>
          </button>
        </div>
        
        {/* Desktop Finalize Button */}
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="hidden sm:flex yellow-button text-black px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-primary/20 items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Finalizar e Gerar Laudo'}
        </button>
      </div>

      {/* Sticky Mobile Bottom Bar */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-lg border-t border-slate-100 z-50 flex gap-3 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
         {step === 2 && (
           <button 
             onClick={() => setStep(1)}
             className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 border border-slate-200"
           >
             <ArrowLeft className="w-4 h-4" />
             Voltar
           </button>
         )}
         {step === 1 && (
           <button 
             onClick={() => setStep(2)}
             className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-lg shadow-black/10"
           >
             Próximo
             <ArrowRight className="w-4 h-4" />
           </button>
         )}
         <button 
           onClick={handleSave}
           disabled={isSaving}
           className="flex-[1.5] yellow-button text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
         >
           <Save className="w-4 h-4" />
           {isSaving ? 'Salvando...' : 'Finalizar'}
         </button>
      </div>

      <div className="flex items-center justify-center w-full mb-6 sm:mb-10">
        <div className="flex items-center gap-2 sm:gap-6">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2 sm:gap-3">
              <div className={cn(
                "w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-xs sm:text-sm font-black transition-all border-2",
                step === s 
                  ? "bg-primary border-primary text-black shadow-lg shadow-primary/20" 
                  : "bg-white border-slate-100 text-slate-300"
              )}>
                {s}
              </div>
              <span className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-widest", step === s ? "text-slate-900" : "text-slate-300")}>
                {s === 1 ? 'Geral' : 'Cômodos'}
              </span>
              {s === 1 && <div className="w-6 sm:w-16 h-[2px] bg-slate-100" />}
            </div>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="glass-card p-6 md:p-10 space-y-8 md:space-y-10 bg-white border-slate-200 shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* CEP */}
                <div className="md:col-span-3 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">CEP</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      maxLength={9}
                      value={formData.cep}
                      onChange={e => handleCEPChange(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 pl-12 pr-6 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-7 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                    <input 
                      type="text" 
                      value={formData.propertyAddress}
                      onChange={e => setFormData({...formData, propertyAddress: e.target.value})}
                      placeholder="Rua, bairro, cidade - UF"
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 pl-12 pr-6 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                {/* Number */}
                <div className="md:col-span-2 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nº</label>
                  <input 
                    type="text" 
                    value={formData.propertyNumber}
                    onChange={e => setFormData({...formData, propertyNumber: e.target.value})}
                    placeholder="123"
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 px-6 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Property Type Custom Dropdown */}
                <div className="md:col-span-6 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Imóvel</label>
                  <div className="relative" id="property-type-dropdown">
                    <button 
                      onClick={() => setIsTypeOpen(!isTypeOpen)}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 pl-12 pr-6 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all shadow-sm flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <Building className="w-4 h-4 text-slate-300 group-hover:text-primary transition-colors" />
                        <span className="font-medium">{propertyTypes.find(t => t.value === formData.propertyType)?.label}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-slate-300 transition-transform", isTypeOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isTypeOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-2xl"
                        >
                          {propertyTypes.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => {
                                setFormData({ ...formData, propertyType: type.value });
                                setIsTypeOpen(false);
                              }}
                              className={cn(
                                "w-full p-5 text-left text-sm transition-all flex items-center justify-between hover:bg-slate-50",
                                formData.propertyType === type.value ? "text-primary font-bold bg-primary/5" : "text-slate-600"
                              )}
                            >
                              {type.label}
                              {formData.propertyType === type.value && <CheckCircle2 className="w-4 h-4" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Date */}
                <div className="md:col-span-6 space-y-2.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data da Vistoria</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4.5 pl-12 pr-6 text-slate-900 text-sm focus:border-primary/50 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {/* Locador */}
              <div className="glass-card p-8 space-y-8 bg-white border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <Building className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Dados do Locador</h3>
                </div>
                <div className="space-y-5">
                  <input 
                    placeholder="Nome Completo"
                    value={formData.landlordData.name}
                    onChange={e => setFormData({...formData, landlordData: {...formData.landlordData, name: e.target.value}})}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-primary/50 outline-none shadow-sm" 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="CPF / CNPJ"
                      maxLength={18}
                      value={formData.landlordData.cpf}
                      onChange={e => setFormData({...formData, landlordData: {...formData.landlordData, cpf: formatCPFCNPJ(e.target.value)}})}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-primary/50 outline-none shadow-sm" 
                    />
                    <input 
                      placeholder="RG"
                      maxLength={12}
                      value={formData.landlordData.rg}
                      onChange={e => setFormData({...formData, landlordData: {...formData.landlordData, rg: formatRG(e.target.value)}})}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-primary/50 outline-none shadow-sm" 
                    />
                  </div>
                </div>
              </div>

              {/* Locatário */}
              <div className="glass-card p-8 space-y-8 bg-white border-slate-200 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary border border-primary/20">
                    <User className="w-5 h-5" />
                  </div>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest">Dados do Locatário</h3>
                </div>
                <div className="space-y-5">
                  <input 
                    placeholder="Nome Completo"
                    value={formData.tenantData.name}
                    onChange={e => setFormData({...formData, tenantData: {...formData.tenantData, name: e.target.value}})}
                    className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-primary/50 outline-none shadow-sm" 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="CPF / CNPJ"
                      maxLength={18}
                      value={formData.tenantData.cpf}
                      onChange={e => setFormData({...formData, tenantData: {...formData.tenantData, cpf: formatCPFCNPJ(e.target.value)}})}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-primary/50 outline-none shadow-sm" 
                    />
                    <input 
                      placeholder="RG"
                      maxLength={12}
                      value={formData.tenantData.rg}
                      onChange={e => setFormData({...formData, tenantData: {...formData.tenantData, rg: formatRG(e.target.value)}})}
                      className="w-full bg-white border border-slate-200 rounded-2xl py-4 px-6 text-sm text-slate-900 focus:border-primary/50 outline-none shadow-sm" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex justify-end pt-6">
              <button 
                onClick={() => setStep(2)}
                className="bg-slate-900 text-white px-12 py-4.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-black transition-all flex items-center gap-2 shadow-xl shadow-black/10"
              >
                Próximo Passo
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-10"
          >
            <div className="space-y-8">
              {rooms.map((room, rIndex) => (
                <div key={room.id} className="glass-card overflow-hidden transition-all border-slate-200 bg-white shadow-sm hover:shadow-md mx-[-8px] sm:mx-0">
                  <div 
                    onClick={() => setRooms(rooms.map(r => r.id === room.id ? {...r, isExpanded: !r.isExpanded} : r))}
                    className="p-5 sm:p-8 flex items-center justify-between cursor-pointer hover:bg-slate-50/50 transition-all"
                  >
                    <div className="flex items-center gap-3 sm:gap-5">
                      <div className="w-10 h-10 sm:w-14 sm:h-14 bg-primary/10 rounded-xl sm:rounded-2xl flex items-center justify-center text-primary font-black border border-primary/20 shadow-sm text-xs sm:text-base">
                        {rIndex + 1}
                      </div>
                      <div>
                        <input 
                          value={room.name}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setRooms(rooms.map(r => r.id === room.id ? {...r, name: e.target.value} : r))}
                          className="bg-transparent border-none text-base sm:text-xl font-bold text-slate-900 outline-none focus:text-primary transition-all w-full max-w-[150px] sm:max-w-none"
                        />
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 sm:mt-1">{room.items.length} ITENS</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeRoom(room.id); }}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                      {room.isExpanded ? <ChevronUp className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" /> : <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {room.isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-slate-100 bg-slate-50/30"
                      >
                        <div className="p-4 sm:p-8 space-y-6 sm:space-y-8">
                          <div className="space-y-6">
                            {room.items.map((item, iIndex) => (
                              <div key={item.id} className="space-y-4 p-4 sm:p-6 bg-white border-b sm:border border-slate-100 sm:border-slate-200 sm:rounded-3xl group relative sm:shadow-sm">
                                <div className="flex flex-col gap-4">
                                   <div className="flex items-center gap-3 w-full">
                                     <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-100 shrink-0">
                                        {iIndex + 1}
                                     </div>
                                     <textarea 
                                       rows={1}
                                       value={item.description}
                                       onChange={e => {
                                         updateItem(room.id, item.id, 'description', e.target.value);
                                         e.target.style.height = 'auto';
                                         e.target.style.height = (e.target.scrollHeight) + 'px';
                                       }}
                                       onFocus={e => {
                                         e.target.style.height = 'auto';
                                         e.target.style.height = (e.target.scrollHeight) + 'px';
                                       }}
                                       placeholder="O que está vistoriando?"
                                       className="flex-1 bg-transparent border-none text-base font-bold text-slate-900 outline-none placeholder:text-slate-300 resize-none min-h-[28px] leading-relaxed py-1 w-full block"
                                     />
                                      <button 
                                         onClick={() => removeItem(room.id, item.id)}
                                         className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                       >
                                         <Trash2 className="w-4 h-4" />
                                       </button>
                                   </div>
                                   
                                   <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl w-full sm:w-fit border border-slate-100">
                                       {['BOM', 'REG', 'RUIM'].map(s => (
                                         <button 
                                           key={s}
                                           onClick={() => updateItem(room.id, item.id, 'status', s)}
                                           className={cn(
                                             "flex-1 sm:flex-none px-4 py-2.5 rounded-lg text-[9px] font-black transition-all",
                                             item.status === s 
                                               ? "bg-white text-black shadow-md border border-slate-100" 
                                               : "text-slate-400 hover:text-slate-600"
                                           )}
                                         >
                                           {s}
                                         </button>
                                       ))}
                                   </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                                  <div className="md:col-span-7">
                                    <textarea 
                                      value={item.observations}
                                      onChange={e => updateItem(room.id, item.id, 'observations', e.target.value)}
                                      placeholder="Observações detalhadas sobre o estado do item..."
                                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-5 text-sm text-slate-600 outline-none focus:border-primary/30 transition-all min-h-[100px] resize-none shadow-inner"
                                    />
                                  </div>
                                  <div className="md:col-span-5 space-y-5">
                                    <div className="space-y-3">
                                      <div className="relative group">
                                        <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <input 
                                          value={item.videoUrl}
                                          onChange={e => updateItem(room.id, item.id, 'videoUrl', e.target.value)}
                                          placeholder="Link de vídeo (Ex: YouTube)"
                                          className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3.5 pl-12 pr-4 text-[10px] text-slate-600 outline-none focus:border-primary/40 focus:bg-white transition-all shadow-inner"
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-primary transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-sm active:scale-95">
                                          <ImageIcon className="w-3.5 h-3.5" />
                                          Galeria
                                            <input 
                                              type="file" multiple accept="image/*" className="hidden"
                                              onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                setPhotoFiles(prev => ({ ...prev, [`item-${item.id}`]: [...(prev[`item-${item.id}`] || []), ...files] }));
                                              }}
                                            />
                                          </label>
                                          <label className="flex items-center justify-center gap-2 py-3 bg-slate-900 text-white rounded-xl hover:bg-black transition-all text-[9px] font-black uppercase tracking-widest cursor-pointer shadow-md active:scale-95">
                                            <ImageIcon className="w-3.5 h-3.5" />
                                            Câmera
                                            <input 
                                              type="file" multiple accept="image/*" capture="environment" className="hidden"
                                              onChange={(e) => {
                                                const files = Array.from(e.target.files || []);
                                                setPhotoFiles(prev => ({ ...prev, [`item-${item.id}`]: [...(prev[`item-${item.id}`] || []), ...files] }));
                                              }}
                                            />
                                          </label>
                                      </div>
                                    </div>

                                    {/* Previews */}
                                    <div className="space-y-4">
                                      {(photoFiles[`item-${item.id}`]?.length > 0 || videoFiles[`item-${item.id}`]?.length > 0) && (
                                        <div className="flex flex-wrap gap-2.5 p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                                          {photoFiles[`item-${item.id}`]?.map((file, idx) => (
                                            <div 
                                              key={`${file.name}-${idx}`} 
                                              className="w-20 h-20 rounded-xl overflow-hidden border border-slate-200 relative group shadow-sm cursor-zoom-in"
                                              onClick={() => setPreviewImage(URL.createObjectURL(file))}
                                            >
                                              <img 
                                                src={URL.createObjectURL(file)} 
                                                className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                                onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                                              />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button 
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newFiles = [...photoFiles[`item-${item.id}`]];
                                                    newFiles.splice(idx, 1);
                                                    setPhotoFiles(prev => ({ ...prev, [`item-${item.id}`]: newFiles }));
                                                  }}
                                                  className="w-8 h-8 bg-rose-500 rounded-lg flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-lg"
                                                >
                                                  <X className="w-4 h-4" />
                                                </button>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <button 
                              onClick={() => addItem(room.id)}
                              className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-widest shadow-sm"
                            >
                              <Plus className="w-5 h-5" />
                              Adicionar Item no {room.name}
                            </button>
                          </div>

                          <div className="space-y-6 pt-8 border-t border-slate-100">
                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Fotos do Cômodo</p>
                              <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm active:scale-95">
                                  <ImageIcon className="w-5 h-5" />
                                  Galeria
                                  <input 
                                    type="file" multiple accept="image/*" className="hidden" 
                                    onChange={(e) => handlePhotoUpload(room.id, e)}
                                  />
                                </label>
                                <label className="flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-md active:scale-95">
                                  <ImageIcon className="w-5 h-5" />
                                  Câmera
                                  <input 
                                    type="file" multiple accept="image/*" capture="environment" className="hidden" 
                                    onChange={(e) => handlePhotoUpload(room.id, e)}
                                  />
                                </label>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Vídeo do Cômodo</p>
                              <div className="grid grid-cols-2 gap-3">
                                <label className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-sm active:scale-95">
                                  <Video className="w-5 h-5" />
                                  Galeria
                                  <input 
                                    type="file" accept="video/*" className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) setVideoFiles(prev => ({ ...prev, [room.id]: [file] }));
                                    }}
                                  />
                                </label>
                                <label className="flex items-center justify-center gap-3 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-md active:scale-95">
                                  <Video className="w-5 h-5" />
                                  Câmera
                                  <input 
                                    type="file" accept="video/*" capture="environment" className="hidden" 
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) setVideoFiles(prev => ({ ...prev, [room.id]: [file] }));
                                    }}
                                  />
                                </label>
                              </div>
                            </div>

                            {/* Room Previews */}
                            <div className="flex flex-wrap gap-2.5">
                              {photoFiles[room.id]?.map((file, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-xl overflow-hidden border border-slate-200 relative group shadow-sm cursor-zoom-in" onClick={() => setPreviewImage(URL.createObjectURL(file))}>
                                  <img 
                                    src={URL.createObjectURL(file)} 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                    onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                                  />
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const newFiles = [...photoFiles[room.id]];
                                      newFiles.splice(idx, 1);
                                      setPhotoFiles(prev => ({ ...prev, [room.id]: newFiles }));
                                    }}
                                    className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                              {videoFiles[room.id]?.map((file, idx) => (
                                <div key={idx} className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center relative group">
                                  <Video className="w-6 h-6 text-slate-400" />
                                  <button 
                                    onClick={() => setVideoFiles(prev => {
                                      const next = {...prev};
                                      delete next[room.id];
                                      return next;
                                    })}
                                    className="absolute top-1 right-1 w-5 h-5 bg-rose-500 rounded-lg flex items-center justify-center text-white"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <button 
                onClick={addRoom}
                className="w-full py-10 border-2 border-dashed border-primary/20 rounded-3xl text-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-4 group"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Plus className="w-7 h-7" />
                </div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em]">Adicionar Outro Cômodo</span>
              </button>
            </div>

            <div className="flex justify-between pt-8">
              <button 
                onClick={() => setStep(1)}
                className="bg-white border border-slate-200 text-slate-500 px-12 py-4.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar para Dados Gerais
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
      />
      <ImagePreviewModal 
        url={previewImage} 
        onClose={() => setPreviewImage(null)} 
      />
    </div>
  );
}

function ChevronRight(props: any) {
  return (
    <svg 
      {...props} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}
