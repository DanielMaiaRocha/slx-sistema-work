import puppeteer from 'puppeteer';
import ExcelJS from 'exceljs';
import { Media } from '../models';

// Friendly PT-BR labels for Asaas statement transaction types.
const TYPE_LABELS: Record<string, string> = {
  PAYMENT_RECEIVED: 'Cobrança recebida',
  PAYMENT_RECEIVED_IN_CASH: 'Recebimento em dinheiro',
  PIX_TRANSACTION_RECEIVED: 'Recebimento via Pix',
  PAYMENT_FEE: 'Taxa de cobrança (Pix/Boleto)',
  PAYMENT_MESSAGING_NOTIFICATION_FEE: 'Taxa de mensageria',
  INSTANT_TEXT_MESSAGE_FEE: 'Taxa de SMS',
  TRANSFER: 'Transferência / Saque',
  TRANSFER_FEE: 'Taxa de transferência',
  PIX_TRANSACTION_DEBIT: 'Débito via Pix',
  PIX_TRANSACTION_FEE: 'Taxa de Pix',
  BILL_PAYMENT: 'Pagamento de conta',
  BILL_PAYMENT_FEE: 'Taxa de pagamento de conta',
  PHONE_RECHARGE: 'Recarga de celular',
  REFUND: 'Estorno',
  REFUND_REVERSAL: 'Reversão de estorno',
  CHARGEBACK: 'Chargeback',
  CHARGEBACK_REVERSAL: 'Reversão de chargeback',
  ASAAS_CARD_RECHARGE: 'Recarga cartão Asaas',
  ASAAS_CARD_BALANCE_CREDIT: 'Crédito cartão Asaas',
  ASAAS_CARD_BALANCE_DEBIT: 'Débito cartão Asaas',
  CREDIT: 'Crédito',
  DEBIT: 'Débito',
};

function labelFor(type: string): string {
  if (TYPE_LABELS[type]) return TYPE_LABELS[type];
  return type
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// Reuse a single headless browser across exports — launching Chromium is the
// slowest part of a PDF, so we pay it once and keep the instance warm.
let sharedBrowser: any = null;
let launching: Promise<any> | null = null;
async function getBrowser(): Promise<any> {
  if (sharedBrowser?.connected) return sharedBrowser;
  if (launching) return launching;
  launching = puppeteer
    .launch({
      headless: true,
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    })
    .then((b) => {
      sharedBrowser = b;
      b.on('disconnected', () => { sharedBrowser = null; });
      return b;
    })
    .finally(() => { launching = null; });
  return launching;
}

const isFee = (type: string) => /FEE/.test(type);
const isReceived = (type: string) => type.includes('RECEIVED');

function brl(v: number): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function bucketLabel(bucket: string, granularity: 'day' | 'month'): string {
  if (granularity === 'day') {
    const [, m, d] = bucket.split('-');
    return `${d}/${m}`;
  }
  const [y, m] = bucket.split('-');
  return `${MONTH_ABBR[Number(m) - 1]}/${y.slice(2)}`;
}

export interface ReconciliationReport {
  period: { startDate: string | null; finishDate: string; label: string };
  totals: {
    received: number;
    totalIn: number;
    totalOut: number;
    net: number;
    feesTotal: number;
    transactionCount: number;
  };
  currentBalance: number | null;
  openingBalance: number | null;
  closingBalance: number | null;
  byType: { type: string; label: string; count: number; total: number; direction: 'in' | 'out' }[];
  fees: { type: string; label: string; count: number; total: number }[];
  series: { bucket: string; label: string; in: number; out: number; net: number }[];
  granularity: 'day' | 'month';
}

export class ReconciliationService {
  static aggregate(
    transactions: any[],
    opts: { startDate: string | null; finishDate: string; label: string; currentBalance: number | null }
  ): ReconciliationReport {
    const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    // Granularity: per-day when the range is within a single calendar month.
    const months = new Set(sorted.map((t) => (t.date || '').slice(0, 7)));
    const granularity: 'day' | 'month' = months.size <= 1 ? 'day' : 'month';

    let received = 0;
    let totalIn = 0;
    let totalOut = 0;
    let feesTotal = 0;

    const byTypeMap = new Map<string, { count: number; total: number }>();
    const seriesMap = new Map<string, { in: number; out: number }>();

    for (const t of sorted) {
      const v = Number(t.value) || 0;
      if (v >= 0) {
        totalIn += v;
        if (isReceived(t.type)) received += v;
      } else {
        totalOut += -v;
        if (isFee(t.type)) feesTotal += -v;
      }

      const bt = byTypeMap.get(t.type) || { count: 0, total: 0 };
      bt.count += 1;
      bt.total += v;
      byTypeMap.set(t.type, bt);

      const bucket = granularity === 'day' ? (t.date || '').slice(0, 10) : (t.date || '').slice(0, 7);
      const s = seriesMap.get(bucket) || { in: 0, out: 0 };
      if (v >= 0) s.in += v;
      else s.out += -v;
      seriesMap.set(bucket, s);
    }

    const byType = Array.from(byTypeMap.entries())
      .map(([type, agg]) => ({
        type,
        label: labelFor(type),
        count: agg.count,
        total: agg.total,
        direction: (agg.total >= 0 ? 'in' : 'out') as 'in' | 'out',
      }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

    const fees = byType
      .filter((b) => isFee(b.type))
      .map((b) => ({ type: b.type, label: b.label, count: b.count, total: Math.abs(b.total) }))
      .sort((a, b) => b.total - a.total);

    const series = Array.from(seriesMap.entries())
      .sort((a, b) => (a[0] < b[0] ? -1 : 1))
      .map(([bucket, s]) => ({
        bucket,
        label: bucketLabel(bucket, granularity),
        in: s.in,
        out: s.out,
        net: s.in - s.out,
      }));

    const openingBalance = sorted.length ? (Number(sorted[0].balance) || 0) - (Number(sorted[0].value) || 0) : null;
    const closingBalance = sorted.length ? Number(sorted[sorted.length - 1].balance) || 0 : null;

    return {
      period: { startDate: opts.startDate, finishDate: opts.finishDate, label: opts.label },
      totals: {
        received,
        totalIn,
        totalOut,
        net: totalIn - totalOut,
        feesTotal,
        transactionCount: sorted.length,
      },
      currentBalance: opts.currentBalance,
      openingBalance,
      closingBalance,
      byType,
      fees,
      series,
      granularity,
    };
  }

  private static async logoToBase64(logoUrl?: string | null): Promise<string | null> {
    if (!logoUrl) return null;
    const m = logoUrl.match(/\/api\/media\/([a-zA-Z0-9_-]+)/);
    if (!m) return logoUrl.startsWith('data:') || logoUrl.startsWith('http') ? logoUrl : null;
    try {
      const media: any = await Media.findById(m[1]).lean();
      if (!media) return null;
      const buf = Buffer.isBuffer(media.data) ? media.data : media.data?.buffer ?? Buffer.from(media.data ?? []);
      return `data:${media.mimeType};base64,${buf.toString('base64')}`;
    } catch {
      return null;
    }
  }

  static async generatePdf(report: ReconciliationReport, branding: any): Promise<Buffer> {
    const primary = branding?.primaryColor || '#6D28D9';
    const logo = await ReconciliationService.logoToBase64(branding?.logoUrl);
    const maxBar = Math.max(1, ...report.series.map((s) => Math.max(s.in, s.out)));

    const feeRows = report.fees
      .map(
        (f) => `<tr>
          <td>${f.label}</td>
          <td style="text-align:center">${f.count}</td>
          <td style="text-align:right;color:#b91c1c">${brl(f.total)}</td>
        </tr>`
      )
      .join('');

    const typeRows = report.byType
      .map(
        (b) => `<tr>
          <td>${b.label}</td>
          <td style="text-align:center">${b.count}</td>
          <td style="text-align:right;color:${b.direction === 'in' ? '#047857' : '#b91c1c'}">${brl(b.total)}</td>
        </tr>`
      )
      .join('');

    const chartBars = report.series
      .map((s) => {
        const inH = Math.round((s.in / maxBar) * 90);
        const outH = Math.round((s.out / maxBar) * 90);
        return `<div class="bar-group">
          <div class="bars">
            <div class="bar bar-in" style="height:${inH}px" title="${brl(s.in)}"></div>
            <div class="bar bar-out" style="height:${outH}px" title="${brl(s.out)}"></div>
          </div>
          <div class="bar-label">${s.label}</div>
        </div>`;
      })
      .join('');

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      body { font-family: 'Helvetica','Arial',sans-serif; color:#1e293b; margin:0; padding:36px; font-size:12px; }
      .header { display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid ${primary}; padding-bottom:16px; margin-bottom:8px; }
      .logo { max-height:54px; max-width:180px; }
      .company { text-align:right; font-size:11px; color:#64748b; }
      .company strong { color:#0f172a; font-size:13px; }
      h1 { font-size:20px; text-transform:uppercase; letter-spacing:1px; margin:18px 0 2px; }
      .period { color:#64748b; font-size:11px; margin-bottom:20px; }
      .cards { display:flex; gap:12px; margin-bottom:24px; }
      .card { flex:1; border:1px solid #e2e8f0; border-radius:12px; padding:14px; }
      .card .lbl { font-size:9px; text-transform:uppercase; letter-spacing:1px; color:#94a3b8; font-weight:bold; }
      .card .val { font-size:18px; font-weight:800; margin-top:6px; }
      .card.in .val { color:#047857; } .card.out .val { color:#b91c1c; } .card.net .val { color:${primary}; }
      .section-title { font-size:13px; font-weight:800; text-transform:uppercase; letter-spacing:0.5px; margin:24px 0 10px; border-left:4px solid ${primary}; padding-left:10px; }
      table { width:100%; border-collapse:collapse; }
      th { text-align:left; font-size:9px; text-transform:uppercase; letter-spacing:0.5px; color:#94a3b8; border-bottom:2px solid #e2e8f0; padding:8px 6px; }
      td { padding:7px 6px; border-bottom:1px solid #f1f5f9; font-size:11px; }
      .chart { display:flex; align-items:flex-end; gap:10px; height:130px; border-bottom:2px solid #e2e8f0; padding:0 4px 0; margin-bottom:6px; }
      .bar-group { flex:1; display:flex; flex-direction:column; align-items:center; justify-content:flex-end; height:100%; }
      .bars { display:flex; gap:3px; align-items:flex-end; height:100%; }
      .bar { width:10px; border-radius:3px 3px 0 0; }
      .bar-in { background:#10b981; } .bar-out { background:#f43f5e; }
      .bar-label { font-size:8px; color:#94a3b8; margin-top:4px; }
      .legend { font-size:9px; color:#64748b; margin-bottom:20px; }
      .legend .dot { display:inline-block; width:8px; height:8px; border-radius:2px; margin-right:4px; }
      .footer { margin-top:32px; text-align:center; font-size:8px; color:#94a3b8; border-top:1px solid #e2e8f0; padding-top:10px; }
    </style></head><body>
      <div class="header">
        ${logo ? `<img src="${logo}" class="logo">` : `<div style="font-weight:800;font-size:22px;color:${primary}">${branding?.name || 'SLX'}</div>`}
        <div class="company">
          <strong>${branding?.name || 'SLX Imobiliária'}</strong><br>
          ${branding?.config?.creci ? `CRECI: ${branding.config.creci}<br>` : ''}
          ${branding?.config?.address || ''}
        </div>
      </div>
      <h1>Conciliação Bancária — Asaas</h1>
      <div class="period">Período: ${report.period.label} &nbsp;•&nbsp; Gerado em ${new Date().toLocaleString('pt-BR')}</div>

      <div class="cards">
        <div class="card in"><div class="lbl">Total Recebido</div><div class="val">${brl(report.totals.received)}</div></div>
        <div class="card in"><div class="lbl">Entradas</div><div class="val">${brl(report.totals.totalIn)}</div></div>
        <div class="card out"><div class="lbl">Saídas</div><div class="val">${brl(report.totals.totalOut)}</div></div>
        <div class="card net"><div class="lbl">Em Caixa (líquido)</div><div class="val">${brl(report.totals.net)}</div></div>
      </div>
      <div class="cards">
        <div class="card out"><div class="lbl">Total de Taxas</div><div class="val" style="color:#b91c1c">${brl(report.totals.feesTotal)}</div></div>
        <div class="card"><div class="lbl">Transações</div><div class="val">${report.totals.transactionCount}</div></div>
        <div class="card"><div class="lbl">Saldo no Fim</div><div class="val">${report.closingBalance != null ? brl(report.closingBalance) : '—'}</div></div>
        <div class="card"><div class="lbl">Saldo Atual</div><div class="val">${report.currentBalance != null ? brl(report.currentBalance) : '—'}</div></div>
      </div>

      <div class="section-title">Fluxo por ${report.granularity === 'day' ? 'Dia' : 'Mês'}</div>
      <div class="chart">${chartBars}</div>
      <div class="legend"><span class="dot" style="background:#10b981"></span>Entradas &nbsp;&nbsp; <span class="dot" style="background:#f43f5e"></span>Saídas</div>

      <div class="section-title">Taxas Cobradas</div>
      <table>
        <thead><tr><th>Taxa</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${feeRows || '<tr><td colspan="3" style="color:#94a3b8;font-style:italic">Nenhuma taxa no período</td></tr>'}</tbody>
      </table>

      <div class="section-title">Movimentações por Tipo</div>
      <table>
        <thead><tr><th>Tipo</th><th style="text-align:center">Qtd.</th><th style="text-align:right">Valor</th></tr></thead>
        <tbody>${typeRows}</tbody>
      </table>

      <div class="footer">${branding?.name || 'SLX Imobiliária'} — Conciliação bancária gerada a partir do extrato Asaas. Documento interno.</div>
    </body></html>`;

    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      // Inline HTML with a data-URI logo — no network to wait on, so
      // 'domcontentloaded' is enough; page.pdf() rasterizes the embedded image.
      await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 5000 }).catch(() => {});
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      });
      return Buffer.from(pdf);
    } finally {
      await page.close().catch(() => {});
    }
  }

  static async generateExcel(report: ReconciliationReport, branding: any): Promise<Buffer> {
    const primary = (branding?.primaryColor || '#6D28D9').replace('#', '').toUpperCase();
    const wb = new ExcelJS.Workbook();
    wb.creator = branding?.name || 'SLX Imobiliária';

    // ── Resumo ──
    const s = wb.addWorksheet('Resumo');
    s.columns = [{ width: 32 }, { width: 22 }];
    s.mergeCells('A1:B1');
    const title = s.getCell('A1');
    title.value = `${branding?.name || 'SLX Imobiliária'} — Conciliação Bancária (Asaas)`;
    title.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
    title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primary}` } };
    title.alignment = { vertical: 'middle', horizontal: 'left' };
    s.getRow(1).height = 26;
    s.addRow(['Período', report.period.label]);

    s.addRow([]);
    const money = 'R$ #,##0.00';
    const addMoney = (label: string, val: number | null) => {
      const r = s.addRow([label, val ?? 0]);
      r.getCell(1).font = { bold: true };
      r.getCell(2).numFmt = money;
    };
    addMoney('Total Recebido', report.totals.received);
    addMoney('Entradas', report.totals.totalIn);
    addMoney('Saídas', report.totals.totalOut);
    addMoney('Em Caixa (líquido)', report.totals.net);
    addMoney('Total de Taxas', report.totals.feesTotal);
    addMoney('Saldo no Fim do Período', report.closingBalance);
    addMoney('Saldo Atual', report.currentBalance);
    const tc = s.addRow(['Qtd. de Transações', report.totals.transactionCount]);
    tc.getCell(1).font = { bold: true };

    // ── Taxas ──
    const f = wb.addWorksheet('Taxas');
    f.columns = [
      { header: 'Taxa', key: 'label', width: 38 },
      { header: 'Quantidade', key: 'count', width: 14 },
      { header: 'Valor (R$)', key: 'total', width: 18 },
    ];
    f.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    f.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primary}` } };
    report.fees.forEach((x) => {
      const r = f.addRow({ label: x.label, count: x.count, total: x.total });
      r.getCell(3).numFmt = money;
    });

    // ── Movimentações por tipo ──
    const t = wb.addWorksheet('Por Tipo');
    t.columns = [
      { header: 'Tipo', key: 'label', width: 38 },
      { header: 'Quantidade', key: 'count', width: 14 },
      { header: 'Valor (R$)', key: 'total', width: 18 },
    ];
    t.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    t.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primary}` } };
    report.byType.forEach((x) => {
      const r = t.addRow({ label: x.label, count: x.count, total: x.total });
      r.getCell(3).numFmt = money;
    });

    // ── Fluxo (série do gráfico) ──
    const c = wb.addWorksheet('Fluxo');
    c.columns = [
      { header: 'Período', key: 'label', width: 14 },
      { header: 'Entradas (R$)', key: 'in', width: 18 },
      { header: 'Saídas (R$)', key: 'out', width: 18 },
      { header: 'Líquido (R$)', key: 'net', width: 18 },
    ];
    c.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${primary}` } };
    report.series.forEach((x) => {
      const r = c.addRow({ label: x.label, in: x.in, out: x.out, net: x.net });
      r.getCell(2).numFmt = money;
      r.getCell(3).numFmt = money;
      r.getCell(4).numFmt = money;
    });

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer as ArrayBuffer);
  }
}
