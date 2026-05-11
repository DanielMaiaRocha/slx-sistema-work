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
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import ConfirmModal from '@/components/ConfirmModal';

interface Room {
  id: string;
  dbId?: string; // ID in the database
  name: string;
  items: { 
    id: string; 
    dbId?: string; 
    description: string; 
    status: string;
    observations?: string;
    videoUrl?: string;
    photos?: { url: string }[];
  }[];
  photos: string[];
  videos: string[];
  isExpanded?: boolean;
}

export default function EditInspectionPage() {
  const { id } = useParams();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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

  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi(`/inspections/${id}`);
        setFormData({
          propertyAddress: data.propertyAddress || '',
          propertyNumber: data.propertyNumber || '',
          propertyType: data.propertyType || 'RESIDENTIAL',
          landlordData: JSON.parse(data.landlordData || '{}'),
          tenantData: JSON.parse(data.tenantData || '{}'),
          inspectorData: JSON.parse(data.inspectorData || '{}'),
          date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          cep: data.cep || '',
        });

        const mappedRooms = data.rooms.map((r: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          dbId: r.id,
          name: r.name,
          isExpanded: false,
          items: r.items.map((i: any) => ({
            id: Math.random().toString(36).substr(2, 9),
            dbId: i.id,
            description: i.description,
            status: i.status,
            observations: i.observations || '',
            videoUrl: i.videoUrl || '',
            photos: i.photos || []
          })),
          photos: r.photos.map((p: any) => p.url),
          videos: r.videos.map((v: any) => v.url)
        }));
        
        if (mappedRooms.length > 0) mappedRooms[0].isExpanded = true;
        setRooms(mappedRooms);
      } catch (error) {
        toast.error('Erro ao carregar vistoria');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [id]);

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

  const removeRoom = (roomId: string, dbId?: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Remover Cômodo',
      message: 'Deseja remover este cômodo e todas as suas observações? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        if (dbId) {
          try {
            await fetchApi(`/inspections/rooms/${dbId}`, { method: 'DELETE' });
          } catch (e) {
            toast.error('Erro ao remover cômodo do servidor');
          }
        }
        setRooms(rooms.filter(r => r.id !== roomId));
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

  const removeItem = async (roomId: string, itemId: string, dbId?: string) => {
    if (dbId) {
      try {
        await fetchApi(`/inspections/items/${dbId}`, { method: 'DELETE' });
      } catch (e) {
        toast.error('Erro ao remover item do servidor');
      }
    }
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

    // Store actual files for later upload
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
    setIsSaving(true);
    try {
      // 1. Update base inspection
      await fetchApi(`/inspections/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...formData, status: 'FINALIZED' })
      });

      // 2. Add/Update rooms, items, and photos
      for (const room of rooms) {
        let roomDbId = room.dbId;
        
        if (!roomDbId) {
          const roomData = await fetchApi(`/inspections/${id}/rooms`, {
            method: 'POST',
            body: JSON.stringify({ name: room.name, order: 0 })
          });
          roomDbId = roomData.id;
        } else {
          await fetchApi(`/inspections/rooms/${roomDbId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: room.name })
          });
        }

        // Handle items
        for (const item of room.items) {
          let itemDbId = item.dbId;
          const itemPayload = { 
            description: item.description, 
            status: item.status,
            observations: item.observations,
            videoUrl: item.videoUrl
          };

          if (!itemDbId) {
            const newItem = await fetchApi(`/inspections/rooms/${roomDbId}/items`, {
              method: 'POST',
              body: JSON.stringify(itemPayload)
            });
            itemDbId = newItem.id;
          } else {
            await fetchApi(`/inspections/items/${itemDbId}`, {
              method: 'PUT',
              body: JSON.stringify(itemPayload)
            });
          }

          // Upload photos for this item
          const itemFiles = photoFiles[`item-${item.id}`] || [];
          for (const file of itemFiles) {
            const photoFormData = new FormData();
            photoFormData.append('photo', file);
            photoFormData.append('itemId', itemDbId as string);
            await fetchApi(`/inspections/rooms/${roomDbId}/photos`, { method: 'POST', body: photoFormData });
          }

          // Upload videos for this item
          const itemVideos = videoFiles[`item-${item.id}`] || [];
          for (const file of itemVideos) {
            const videoFormData = new FormData();
            videoFormData.append('video', file);
            videoFormData.append('itemId', itemDbId as string);
            await fetchApi(`/inspections/rooms/${roomDbId}/videos`, { method: 'POST', body: videoFormData });
          }
        }

        // Upload new photos for this room
        const filesToUpload = photoFiles[room.id] || [];
        for (const file of filesToUpload) {
          const photoFormData = new FormData();
          photoFormData.append('photo', file);
          
          await fetchApi(`/inspections/rooms/${roomDbId}/photos`, {
            method: 'POST',
            body: photoFormData
          });
        }
      }

      toast.success('Vistoria atualizada com sucesso!');
      router.push(`/dashboard/inspections/${id}`);
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="w-full py-4 sm:py-8 space-y-5 sm:space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <Link href={`/dashboard/inspections/${id}`} className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Voltar
        </Link>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="financial-gradient text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>

      <div className="flex items-center justify-center gap-4 mb-8">
        {[1, 2].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center font-black transition-all",
              step === s ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-slate-500"
            )}>
              {s}
            </div>
            <span className={cn("text-xs font-black uppercase tracking-widest", step === s ? "text-primary" : "text-slate-600")}>
              {s === 1 ? 'Dados Gerais' : 'Cômodos e Itens'}
            </span>
            {s === 1 && <div className="w-12 h-px bg-white/5 mx-2" />}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-8"
          >
            <div className="glass-card p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* CEP */}
                <div className="md:col-span-3 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CEP</label>
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input 
                      type="text" 
                      maxLength={9}
                      value={formData.cep}
                      onChange={e => handleCEPChange(e.target.value)}
                      placeholder="00000-000"
                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-primary/50 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Address */}
                <div className="md:col-span-7 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                    <input 
                      type="text" 
                      value={formData.propertyAddress}
                      onChange={e => setFormData({...formData, propertyAddress: e.target.value})}
                      placeholder="Rua, bairro, cidade - UF"
                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-primary/50 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>

                {/* Number */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº</label>
                  <input 
                    type="text" 
                    value={formData.propertyNumber}
                    onChange={e => setFormData({...formData, propertyNumber: e.target.value})}
                    placeholder="123"
                    className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 px-6 text-white text-sm focus:border-primary/50 outline-none transition-all shadow-inner"
                  />
                </div>

                {/* Property Type Custom Dropdown */}
                <div className="md:col-span-6 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Imóvel</label>
                  <div className="relative" id="property-type-dropdown">
                    <button 
                      onClick={() => setIsTypeOpen(!isTypeOpen)}
                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-primary/50 outline-none transition-all shadow-inner flex items-center justify-between text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <Building className="w-4 h-4 text-slate-600 group-hover:text-primary transition-colors" />
                        <span>{propertyTypes.find(t => t.value === formData.propertyType)?.label}</span>
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-slate-600 transition-transform", isTypeOpen && "rotate-180")} />
                    </button>

                    <AnimatePresence>
                      {isTypeOpen && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute z-50 top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl"
                        >
                          {propertyTypes.map((type) => (
                            <button
                              key={type.value}
                              onClick={() => {
                                setFormData({ ...formData, propertyType: type.value });
                                setIsTypeOpen(false);
                              }}
                              className={cn(
                                "w-full p-4 text-left text-sm transition-all flex items-center justify-between hover:bg-white/5",
                                formData.propertyType === type.value ? "text-primary font-bold bg-primary/5" : "text-slate-400"
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
                <div className="md:col-span-6 space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Data da Vistoria</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-4 pl-12 pr-6 text-white text-sm focus:border-primary/50 outline-none transition-all shadow-inner"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Locador */}
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                  <Building className="w-4 h-4 text-primary" />
                  Dados do Locador
                </h3>
                <div className="space-y-4">
                  <input 
                    placeholder="Nome Completo"
                    value={formData.landlordData.name}
                    onChange={e => setFormData({...formData, landlordData: {...formData.landlordData, name: e.target.value}})}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none" 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="CPF / CNPJ"
                      maxLength={18}
                      value={formData.landlordData.cpf}
                      onChange={e => setFormData({...formData, landlordData: {...formData.landlordData, cpf: formatCPFCNPJ(e.target.value)}})}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none" 
                    />
                    <input 
                      placeholder="RG"
                      maxLength={12}
                      value={formData.landlordData.rg}
                      onChange={e => setFormData({...formData, landlordData: {...formData.landlordData, rg: formatRG(e.target.value)}})}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Locatário */}
              <div className="glass-card p-6 space-y-6">
                <h3 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                  <User className="w-4 h-4 text-primary" />
                  Dados do Locatário
                </h3>
                <div className="space-y-4">
                  <input 
                    placeholder="Nome Completo"
                    value={formData.tenantData.name}
                    onChange={e => setFormData({...formData, tenantData: {...formData.tenantData, name: e.target.value}})}
                    className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none" 
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input 
                      placeholder="CPF / CNPJ"
                      maxLength={18}
                      value={formData.tenantData.cpf}
                      onChange={e => setFormData({...formData, tenantData: {...formData.tenantData, cpf: formatCPFCNPJ(e.target.value)}})}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none" 
                    />
                    <input 
                      placeholder="RG"
                      maxLength={12}
                      value={formData.tenantData.rg}
                      onChange={e => setFormData({...formData, tenantData: {...formData.tenantData, rg: formatRG(e.target.value)}})}
                      className="w-full bg-slate-900/50 border border-white/5 rounded-xl py-3 px-4 text-sm text-white focus:border-primary/50 outline-none" 
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => setStep(2)}
                className="bg-white/5 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center gap-2"
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
            className="space-y-8"
          >
            <div className="space-y-6">
              {rooms.map((room, rIndex) => (
                <div key={room.id} className="glass-card overflow-hidden transition-all border-white/5 hover:border-white/10">
                  <div 
                    onClick={() => setRooms(rooms.map(r => r.id === room.id ? {...r, isExpanded: !r.isExpanded} : r))}
                    className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-black">
                        {rIndex + 1}
                      </div>
                      <div>
                        <input 
                          value={room.name}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setRooms(rooms.map(r => r.id === room.id ? {...r, name: e.target.value} : r))}
                          className="bg-transparent border-none text-lg font-bold text-main outline-none focus:text-primary transition-all"
                        />
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">{room.items.length} ITENS OBSERVADOS</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeRoom(room.id, room.dbId); }}
                        className="p-2 text-slate-600 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {room.isExpanded ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                    </div>
                  </div>

                  <AnimatePresence>
                    {room.isExpanded && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-white/5 bg-slate-950/20"
                      >
                        <div className="p-6 space-y-6">
                          <div className="space-y-4">
                            {room.items.map((item, iIndex) => (
                              <div key={item.id} className="space-y-3 p-4 bg-slate-900/40 border border-white/5 rounded-3xl group relative">
                                <div className="flex gap-3 items-center">
                                   <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-black text-slate-500">
                                      {iIndex + 1}
                                   </div>
                                   <input 
                                     value={item.description}
                                     onChange={e => updateItem(room.id, item.id, 'description', e.target.value)}
                                     placeholder="Nome do Item (Ex: Paredes, Piso, Janelas...)"
                                     className="flex-1 bg-transparent border-none text-sm font-bold text-white outline-none placeholder:text-slate-700"
                                   />
                                   <div className="flex items-center gap-1">
                                      {['BOM', 'REG', 'RUIM'].map(s => (
                                        <button 
                                          key={s}
                                          onClick={() => updateItem(room.id, item.id, 'status', s)}
                                          className={cn(
                                            "px-3 py-1.5 rounded-xl text-[9px] font-black transition-all border",
                                            item.status === s 
                                              ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" 
                                              : "bg-white/5 text-slate-600 border-transparent hover:bg-white/10"
                                          )}
                                        >
                                          {s}
                                        </button>
                                      ))}
                                   </div>
                                   <button 
                                      onClick={() => removeItem(room.id, item.id, item.dbId)}
                                      className="p-2 text-slate-700 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                  <div className="md:col-span-7">
                                    <textarea 
                                      value={item.observations}
                                      onChange={e => updateItem(room.id, item.id, 'observations', e.target.value)}
                                      placeholder="Observações detalhadas sobre o estado do item..."
                                      className="w-full bg-slate-950/50 border border-white/5 rounded-2xl p-4 text-xs text-slate-400 outline-none focus:border-primary/30 transition-all min-h-[80px] resize-none"
                                    />
                                  </div>
                                  <div className="md:col-span-5 space-y-4">
                                    <div className="space-y-2">
                                      <div className="relative group">
                                        <Video className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600 group-focus-within:text-primary transition-colors" />
                                        <input 
                                          value={item.videoUrl}
                                          onChange={e => updateItem(room.id, item.id, 'videoUrl', e.target.value)}
                                          placeholder="Link de vídeo (Ex: YouTube)"
                                          className="w-full bg-slate-950/50 border border-white/5 rounded-2xl py-3 pl-11 pr-4 text-[10px] text-slate-300 outline-none focus:border-primary/40 focus:bg-slate-900/50 transition-all"
                                        />
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-2">
                                        <label className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-2xl text-slate-500 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary/5 active:scale-95">
                                          <ImageIcon className="w-3.5 h-3.5" />
                                          Fotos
                                          <input 
                                            type="file" multiple accept="image/*" className="hidden"
                                            onChange={(e) => {
                                              const files = Array.from(e.target.files || []);
                                              setPhotoFiles(prev => ({ ...prev, [`item-${item.id}`]: [...(prev[`item-${item.id}`] || []), ...files] }));
                                            }}
                                          />
                                        </label>
                                        <label className="flex items-center justify-center gap-2 py-3 bg-white/5 border border-white/5 rounded-2xl text-slate-500 hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest cursor-pointer hover:bg-primary/5 active:scale-95">
                                          <Video className="w-3.5 h-3.5" />
                                          Vídeo
                                          <input 
                                            type="file" accept="video/*" className="hidden"
                                            onChange={(e) => {
                                              const file = e.target.files?.[0];
                                              if (file) setVideoFiles(prev => ({ ...prev, [`item-${item.id}`]: [file] }));
                                            }}
                                          />
                                        </label>
                                      </div>
                                    </div>

                                    {/* Previews */}
                                    <div className="space-y-3">
                                      {(photoFiles[`item-${item.id}`]?.length > 0 || videoFiles[`item-${item.id}`]?.length > 0 || (item.photos && item.photos.length > 0)) && (
                                        <div className="flex flex-wrap gap-2 p-3 bg-slate-950/30 rounded-2xl border border-white/5">
                                          {item.photos?.map((p, idx) => (
                                            <div key={idx} className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 relative group shadow-2xl">
                                              <img src={p.url.startsWith('http') ? p.url : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${p.url}`} className="w-full h-full object-cover" />
                                            </div>
                                           ))}
                                           {photoFiles[`item-${item.id}`]?.map((file, idx) => (
                                             <div key={`new-${file.name}-${idx}`} className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 relative group shadow-2xl">
                                               <img 
                                                 src={URL.createObjectURL(file)} 
                                                 className="w-full h-full object-cover opacity-60 transition-transform group-hover:scale-110" 
                                                 onLoad={(e) => URL.revokeObjectURL((e.target as any).src)}
                                               />
                                               <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                                                 <button 
                                                   onClick={() => {
                                                     const newFiles = [...photoFiles[`item-${item.id}`]];
                                                     newFiles.splice(idx, 1);
                                                     setPhotoFiles(prev => ({ ...prev, [`item-${item.id}`]: newFiles }));
                                                   }}
                                                   className="w-8 h-8 bg-rose-500 rounded-xl flex items-center justify-center text-white hover:bg-rose-600 transition-colors shadow-lg"
                                                 >
                                                   <X className="w-4 h-4" />
                                                 </button>
                                               </div>
                                             </div>
                                           ))}
                                          {videoFiles[`item-${item.id}`]?.map((file, idx) => (
                                            <div key={`${file.name}-${idx}`} className="h-24 px-4 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center gap-2 relative group min-w-[120px]">
                                              <Video className="w-6 h-6 text-primary" />
                                              <span className="text-[10px] text-primary font-bold truncate max-w-[100px]">{file.name}</span>
                                              <button 
                                                onClick={() => setVideoFiles(prev => ({ ...prev, [`item-${item.id}`]: [] }))}
                                                className="absolute top-2 right-2 bg-rose-500 text-white rounded-lg p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                                              >
                                                <X className="w-3 h-3" />
                                              </button>
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
                              className="w-full py-4 border-2 border-dashed border-white/5 rounded-2xl text-slate-600 hover:text-primary hover:border-primary/20 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest"
                            >
                              <Plus className="w-4 h-4" />
                              Adicionar Item no {room.name}
                            </button>
                          </div>

                          {/* Photo Gallery Display */}
                          {room.photos.length > 0 && (
                            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 pt-4">
                              {room.photos.map((photo, pIdx) => (
                                <div key={pIdx} className="relative aspect-square rounded-xl overflow-hidden group border border-white/10">
                                  <img 
                                    src={photo.startsWith('http') || photo.startsWith('blob:') ? photo : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${photo}`} 
                                    alt="Vistoria" 
                                    className="w-full h-full object-cover" 
                                  />
                                  <button 
                                    onClick={() => removePhoto(room.id, photo)}
                                    className="absolute top-1 right-1 p-1 bg-rose-500 rounded-lg text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            <label className="flex items-center justify-center gap-2 py-3 bg-slate-900/50 border border-white/5 rounded-xl text-slate-500 hover:text-primary transition-all text-xs font-bold cursor-pointer">
                              <ImageIcon className="w-4 h-4" />
                              Anexar Fotos
                              <input 
                                type="file" 
                                multiple 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => handlePhotoUpload(room.id, e)}
                              />
                            </label>
                            <button className="flex items-center justify-center gap-2 py-3 bg-slate-900/50 border border-white/5 rounded-xl text-slate-500 hover:text-primary transition-all text-xs font-bold">
                              <Video className="w-4 h-4" />
                              Link de Vídeo
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}

              <button 
                onClick={addRoom}
                className="w-full py-8 border-2 border-dashed border-primary/20 rounded-3xl text-primary hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-3"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="w-6 h-6" />
                </div>
                <span className="text-xs font-black uppercase tracking-widest">Adicionar Outro Cômodo</span>
              </button>
            </div>

            <div className="flex justify-between pt-4">
              <button 
                onClick={() => setStep(1)}
                className="bg-white/5 text-white px-10 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-white/10 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Dados Gerais
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        {...confirmConfig}
        onClose={() => setConfirmConfig(prev => ({ ...prev, isOpen: false }))}
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
