'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User as UserIcon, Mail, Phone, MapPin, Shield, Receipt,
  CheckCircle2, Clock, AlertTriangle, ExternalLink, FileText, IdCard,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { fetchApi } from '@/lib/api';

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const formatCpfCnpj = (v: string) => {
  if (!v || v === 'N/A') return v || '—';
  const digits = v.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  return v;
};

const formatPhone = (v: string) => {
  if (!v || v === 'N/A') return v || '—';
  let digits = v.replace(/\D/g, '');
  if (digits.length > 11) digits = digits.slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

const roleLabel = (r: string) =>
  r === 'ADMIN' ? 'Admin' : r === 'OWNER' || r === 'LANDLORD' ? 'Proprietário' : 'Inquilino';

const getStatusColor = (status: string) => {
  if (status === 'Pago') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
  if (status === 'Atrasado') return 'bg-rose-50 text-rose-600 border-rose-200';
  return 'bg-amber-50 text-amber-600 border-amber-200';
};

const getStatusIcon = (status: string) => {
  if (status === 'Pago') return <CheckCircle2 className="w-3 h-3" />;
  if (status === 'Atrasado') return <AlertTriangle className="w-3 h-3" />;
  return <Clock className="w-3 h-3" />;
};

interface UserDetailModalProps {
  userId: string | null;
  userName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function UserDetailModal({ userId, userName, isOpen, onClose }: UserDetailModalProps) {
  const [details, setDetails] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) return;
    let cancelled = false;
    setLoading(true);
    setDetails(null);
    setBills([]);
    Promise.all([
      fetchApi(`/users/${userId}/details`).catch(() => null),
      fetchApi(`/financial/user/${userId}`).catch(() => []),
    ])
      .then(([d, b]) => {
        if (cancelled) return;
        setDetails(d);
        setBills(Array.isArray(b) ? b : []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, userId]);

  const addr = details?.address;
  const fullAddress = addr
    ? [
        [addr.street, addr.number].filter(Boolean).join(', '),
        addr.complement,
        addr.neighborhood,
        [addr.city, addr.state].filter(Boolean).join(' - '),
        addr.postalCode,
      ]
        .filter(Boolean)
        .join(' • ')
    : '';

  const totalOpen = bills
    .filter((b) => b.status !== 'Pago')
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-900 font-black text-lg shrink-0 border border-slate-200">
                  {(details?.name || userName || 'U')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-slate-900 truncate">
                    {details?.name || userName || 'Usuário'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {(details?.role || 'TENANT').split(',').filter(Boolean).map((r: string) => (
                      <span
                        key={r}
                        className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-500 px-2 py-1 rounded-md border border-slate-100"
                      >
                        <Shield className={`w-2.5 h-2.5 ${r === 'ADMIN' ? 'text-rose-500' : 'text-primary'}`} />
                        {roleLabel(r)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900 cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              {loading ? (
                <div className="py-16 text-center text-slate-400 text-sm italic">Carregando cadastro e boletos...</div>
              ) : (
                <>
                  {/* Cadastro */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-primary" />
                      Cadastro
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <DetailField icon={<Mail className="w-3.5 h-3.5" />} label="E-mail" value={details?.email} />
                      <DetailField icon={<Phone className="w-3.5 h-3.5" />} label="Telefone" value={formatPhone(details?.phone)} />
                      <DetailField icon={<IdCard className="w-3.5 h-3.5" />} label="CPF / CNPJ" value={formatCpfCnpj(details?.cpfCnpj)} mono />
                      {details?.creci && (
                        <DetailField icon={<FileText className="w-3.5 h-3.5" />} label="CRECI" value={details.creci} />
                      )}
                      <div className="sm:col-span-2">
                        <DetailField icon={<MapPin className="w-3.5 h-3.5" />} label="Endereço" value={fullAddress || '—'} />
                      </div>
                    </div>
                  </div>

                  {/* Boletos */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-primary" />
                        Boletos ({bills.length})
                      </h3>
                      {totalOpen > 0 && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-500">
                          Em aberto: {formatCurrency(totalOpen)}
                        </span>
                      )}
                    </div>

                    {bills.length === 0 ? (
                      <p className="text-center py-10 text-slate-400 text-sm italic font-medium">
                        Nenhum boleto encontrado para este usuário.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {bills.map((bill) => (
                          <div
                            key={bill.id}
                            className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between gap-3 group hover:border-primary/20 transition-all"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-bold text-slate-900 leading-tight truncate">
                                {bill.description || 'Aluguel'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  Venc. {new Date(bill.dueDate).toLocaleDateString('pt-BR')}
                                </span>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest border ${getStatusColor(bill.status)}`}
                                >
                                  {getStatusIcon(bill.status)}
                                  {bill.status}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-sm font-black text-slate-900">{formatCurrency(bill.amount)}</p>
                            </div>
                            {(bill.invoiceUrl || bill.bankSlipUrl) && (
                              <a
                                href={bill.invoiceUrl || bill.bankSlipUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-all shrink-0 border border-transparent hover:border-slate-200"
                                title="Abrir boleto"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
              <button
                onClick={onClose}
                className="px-8 py-3 bg-slate-900 text-[#FFC107] rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all cursor-pointer hover:bg-black"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function DetailField({
  icon,
  label,
  value,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
      <div className="flex items-center gap-1.5 text-slate-400 mb-1">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <p className={`text-sm font-bold text-slate-900 break-words ${mono ? 'font-mono' : ''}`}>
        {value || '—'}
      </p>
    </div>
  );
}
