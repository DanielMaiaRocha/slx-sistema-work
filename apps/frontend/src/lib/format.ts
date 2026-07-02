// Máscaras/formatadores brasileiros compartilhados por todos os formulários.
// Cada função recebe um valor bruto/parcial e devolve o valor com máscara para
// exibição. Guarde no state o valor mascarado e use `onlyDigits` ao enviar,
// ou guarde só dígitos — desde que consistente por campo.

export const onlyDigits = (v: string | number | null | undefined): string =>
  String(v ?? '').replace(/\D/g, '');

// CPF: 000.000.000-00
export function formatCPF(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

// CNPJ: 00.000.000/0000-00
export function formatCNPJ(v: string): string {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

// CPF ou CNPJ conforme a quantidade de dígitos.
export function formatCpfCnpj(v: string): string {
  const d = onlyDigits(v);
  return d.length > 11 ? formatCNPJ(d) : formatCPF(d);
}

// Telefone: (00) 0000-0000 (fixo) ou (00) 00000-0000 (celular)
export function formatPhone(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return '';
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// CEP: 00000-000
export function formatCEP(v: string): string {
  return onlyDigits(v).slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

// RG (padrão comum SP): 00.000.000-0
export function formatRG(v: string): string {
  const d = onlyDigits(v).slice(0, 9);
  return d
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1})$/, '$1-$2');
}

// Moeda BRL a partir de dígitos representando centavos → "R$ 1.234,56"
export function formatCurrencyBRL(v: string): string {
  const d = onlyDigits(v);
  if (!d) return '';
  return (parseInt(d, 10) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// "R$ 1.234,56" (ou dígitos) → número 1234.56
export function parseCurrencyBRL(v: string): number {
  const d = onlyDigits(v);
  return d ? parseInt(d, 10) / 100 : 0;
}

// Data: dd/mm/aaaa (para inputs de texto; inputs type="date" não precisam)
export function formatDateBR(v: string): string {
  return onlyDigits(v)
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2');
}
