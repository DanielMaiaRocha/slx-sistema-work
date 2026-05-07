'use client';

import { 
  ClipboardCheck, 
  ArrowLeft, 
  Download, 
  MapPin, 
  Calendar, 
  User, 
  Building,
  CheckCircle2,
  AlertCircle,
  FileText,
  Printer,
  Share2,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Video,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { fetchApi } from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function ViewInspectionPage() {
  const { id } = useParams();
  const [inspection, setInspection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [expandedRooms, setExpandedRooms] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchApi(`/inspections/${id}`);
        setInspection(data);
        // Expand first room by default
        if (data.rooms?.length > 0) {
          setExpandedRooms([data.rooms[0].id]);
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar vistoria');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const toggleRoom = (roomId: string) => {
    setExpandedRooms(prev => 
      prev.includes(roomId) ? prev.filter(r => r !== roomId) : [...prev, roomId]
    );
  };

  const handleDownloadPdf = async () => {
    setIsGenerating(true);
    try {
      const response = await fetchApi(`/inspections/${id}/pdf`, { method: 'GET' });
      // The backend should return a URL or trigger a download
      if (response.url) {
        window.open(response.url, '_blank');
      } else {
        toast.error('PDF em geração, aguarde um momento...');
      }
    } catch (error: any) {
      toast.error('Erro ao gerar PDF: ' + error.message);
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!inspection) return <div>Não encontrado</div>;

  const landlord = JSON.parse(inspection.landlordData || '{}');
  const tenant = JSON.parse(inspection.tenantData || '{}');
  const inspector = JSON.parse(inspection.inspectorData || '{}');

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 pb-32 px-4 md:px-0 pt-12 md:pt-16">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Link href="/dashboard/inspections" className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar para Vistorias
          </Link>
          <div className="flex items-center gap-3">
             <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <ClipboardCheck className="w-6 h-6" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-main tracking-tight">Relatório de Vistoria</h1>
                <p className="text-slate-500 font-medium">{inspection.propertyAddress}{inspection.propertyNumber ? `, ${inspection.propertyNumber}` : ''}</p>
             </div>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <button 
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex-1 md:flex-none bg-white/5 text-white px-4 md:px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] hover:bg-white/10 transition-all flex items-center justify-center gap-2 border border-white/5"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span className="hidden sm:inline">{isGenerating ? 'Gerando...' : 'Imprimir'}</span>
            <span className="sm:hidden">{isGenerating ? '...' : 'Imprimir'}</span>
          </button>
          <button 
            onClick={handleDownloadPdf}
            disabled={isGenerating}
            className="flex-1 md:flex-none financial-gradient text-white px-4 md:px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-[10px] shadow-xl transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{isGenerating ? 'Processando...' : 'Baixar PDF'}</span>
            <span className="sm:hidden">{isGenerating ? '...' : 'Baixar'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Detailed Info Cards */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Resumo do Imóvel</h2>
              <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-[9px] font-black uppercase">Finalizado</span>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8">
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Endereço</p>
                      <p className="text-sm text-slate-200 font-bold">{inspection.propertyAddress}{inspection.propertyNumber ? `, ${inspection.propertyNumber}` : ''}</p>
                      {inspection.cep && <p className="text-[10px] text-slate-500">CEP: {inspection.cep}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tipo</p>
                      <p className="text-sm text-slate-200 font-bold">{inspection.propertyType || 'Residencial'}</p>
                    </div>
                  </div>
               </div>
               <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Data</p>
                      <p className="text-sm text-slate-200 font-bold">{format(new Date(inspection.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-slate-500">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Vistoriador</p>
                      <p className="text-sm text-slate-200 font-bold">{inspector.name || inspection.user?.name || 'Sistema'}</p>
                      {inspector.creci && <p className="text-[10px] text-slate-500">CRECI: {inspector.creci}</p>}
                    </div>
                  </div>
               </div>
            </div>
          </div>

          {/* Rooms Sections */}
          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Detalhamento por Cômodo</h3>
            {inspection.rooms?.map((room: any) => (
              <div key={room.id} className="glass-card overflow-hidden">
                 <div 
                  onClick={() => toggleRoom(room.id)}
                  className="p-6 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-sm">
                      {room.name.charAt(0)}
                    </div>
                    <span className="text-lg font-bold text-main">{room.name}</span>
                  </div>
                  <div className="flex items-center gap-2 md:gap-4 shrink-0">
                     <span className="text-[10px] font-black text-slate-600 uppercase hidden sm:inline">{room.items?.length || 0} Itens</span>
                     {expandedRooms.includes(room.id) ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {expandedRooms.includes(room.id) && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="border-t border-white/5"
                    >
                      <div className="p-4 md:p-8 space-y-6">
                            <div className="divide-y divide-white/5">
                              {room.items?.map((item: any) => (
                                <div key={item.id} className="py-8 first:pt-0 last:pb-0 space-y-6">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <div className={cn(
                                        "w-2 h-2 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]",
                                        item.status === 'BOM' ? "bg-emerald-500 shadow-emerald-500/40" : 
                                        item.status === 'REG' ? "bg-amber-500 shadow-amber-500/40" : "bg-rose-500 shadow-rose-500/40"
                                      )} />
                                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
                                        Estado: {item.status === 'BOM' ? 'BOM' : item.status === 'REG' ? 'REGULAR' : 'RUIM'}
                                      </span>
                                    </div>
                                    <h4 className="text-lg font-bold text-white leading-tight">
                                      {item.description || 'Item sem descrição'}
                                    </h4>
                                  </div>

                                  {(item.observations || (item.photos && item.photos.length > 0) || (item.videos && item.videos.length > 0) || item.videoUrl) && (
                                    <div className="space-y-6 pl-5 border-l-2 border-white/5">
                                      {item.observations && (
                                        <div className="space-y-2">
                                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Observações Detalhadas</p>
                                          <p className="text-sm text-slate-400 font-medium leading-relaxed italic bg-white/5 p-4 rounded-2xl border border-white/5">
                                            "{item.observations}"
                                          </p>
                                        </div>
                                      )}
                                      
                                      {((item.photos && item.photos.length > 0) || (item.videos && item.videos.length > 0)) && (
                                        <div className="space-y-3">
                                          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Galeria do Item</p>
                                          <div className="flex flex-wrap gap-3">
                                            {item.photos?.map((photo: any, pIdx: number) => {
                                              const photoUrl = typeof photo === 'string' ? photo : photo.url;
                                              const fullUrl = photoUrl.startsWith('http') ? photoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${photoUrl}`;
                                              return (
                                                <div 
                                                  key={pIdx} 
                                                  onClick={() => setSelectedImage(fullUrl)}
                                                  className="w-24 h-24 rounded-2xl overflow-hidden border border-white/10 shadow-2xl group cursor-pointer"
                                                >
                                                  <img 
                                                    src={fullUrl} 
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                                  />
                                                </div>
                                              );
                                            })}
                                            {item.videos?.map((v: any, vIdx: number) => (
                                              <a key={vIdx} href={v.url} target="_blank" className="w-24 h-24 rounded-2xl bg-primary/10 border border-primary/20 flex flex-col items-center justify-center gap-2 text-primary hover:bg-primary/20 transition-all shadow-xl">
                                                <Video className="w-6 h-6" />
                                                <span className="text-[9px] font-black uppercase">Ver Vídeo</span>
                                              </a>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                         
                         {/* Real Photo Gallery */}
                         {room.photos?.length > 0 && (
                           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-4 border-t border-white/5">
                              {room.photos.map((photo: any, pIdx: number) => {
                                 const photoUrl = typeof photo === 'string' ? photo : photo.url;
                                 if (!photoUrl) return null;
                                 
                                 return (
                                <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/5 group shadow-lg">
                                  <img 
                                      src={photoUrl.startsWith('http') ? photoUrl : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${photoUrl}`} 
                                    alt="Vistoria" 
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                                  />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                     <FileText className="w-6 h-6 text-white" />
                                  </div>
                                </div>
                                 );
                               })}
                           </div>
                         )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
           <div className="glass-card p-6 space-y-6">
              <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Partes Envolvidas
              </h3>
              <div className="space-y-6">
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Locatário</p>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                       <p className="text-sm font-bold text-slate-200">{tenant.name || 'Não informado'}</p>
                       <p className="text-[10px] text-slate-500">CPF: {tenant.cpf || '---'}</p>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Locador</p>
                    <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
                       <p className="text-sm font-bold text-slate-200">{landlord.name || 'Não informado'}</p>
                       <p className="text-[10px] text-slate-500">CPF: {landlord.cpf || '---'}</p>
                    </div>
                 </div>
              </div>
           </div>

            <div className="glass-card p-6 bg-primary/5 border-primary/10 space-y-4">
               <h3 className="text-xs font-black text-primary uppercase tracking-[0.2em]">Ações Rápidas</h3>
               <div className="space-y-2">
                  <button 
                    onClick={() => {
                      const publicUrl = `${window.location.origin}/public/inspections/${id}`;
                      navigator.clipboard.writeText(publicUrl);
                      toast.success('Link público copiado!');
                    }}
                    className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                  >
                     <Share2 className="w-4 h-4" />
                     Compartilhar Link
                  </button>
                  <Link href={`/dashboard/inspections/edit/${id}`} className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2">
                     Editar Laudo
                  </Link>
               </div>
            </div>
        </div>
      </div>
      {/* Image Preview Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 md:p-12 cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-5xl w-full h-full flex items-center justify-center"
              onClick={e => e.stopPropagation()}
            >
              <img 
                src={selectedImage} 
                className="max-w-full max-h-full object-contain rounded-3xl shadow-2xl shadow-black/50" 
              />
              <button 
                onClick={() => setSelectedImage(null)}
                className="absolute top-4 right-4 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white backdrop-blur-md transition-all border border-white/10"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
