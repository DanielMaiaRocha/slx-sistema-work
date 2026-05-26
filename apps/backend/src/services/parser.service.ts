import path from 'path';
import fs from 'fs';
import { Media } from '../models';
const pdf = require('pdf-parse');

// Common Brazilian rental contract clauses are detected with multiple regex
// variants tried in priority order: most specific (less likely to false-positive)
// to most generic. The first one that matches wins.

const ADDRESS_PATTERNS = [
  // "situado na/no/à ..."  (original)
  /(?:situado|localizado|sito)\s+(?:na|no|à|em)\s+([\s\S]+?)(?=\.\s+[A-Z]{2,}|\.\s+(?:Parágrafo|Cláusula|CLÁUSULA|PARÁGRAFO)|;|\n\n|$)/i,
  // "imóvel objeto desta locação está localizado em ..."
  /im[oó]vel[^.]{0,60}(?:objeto|locado|locação)[^.]{0,80}(?:situado|localizado|sito)\s+(?:na|no|à|em)\s+([\s\S]+?)(?=\.\s+[A-Z]{2,}|\.\s+(?:Parágrafo|Cláusula)|;|\n\n|$)/i,
  // "endereço: ..."  (form-style contracts)
  /(?:^|\n)\s*endere[cç]o\s*:\s*([^\n]+)/i,
];

const RENT_PATTERNS = [
  // Most specific: "valor mensal do aluguel", "aluguel mensal de R$"
  /alugue[lr]\s+(?:mensal\s+)?(?:\bde\b|\bno\s+valor\s+de\b)\s+R\$\s*([\d.,]+)/i,
  // "valor mensal de R$", "valor mensal do aluguel é de R$"
  /valor\s+mensal[^R$]{0,40}R\$\s*([\d.,]+)/i,
  // "no valor de R$" near "aluguel" (within ~80 chars)
  /alugue[lr][\s\S]{0,80}?valor[\s\S]{0,15}R\$\s*([\d.,]+)/i,
  // Generic: "valor de R$" — last resort, prone to matching multas
  /valor\s+(?:de|mensal\s+de|do\s+alugue[lr]\s+de)\s+R\$\s*([\d.,]+)/i,
];

const DURATION_PATTERNS = [
  // "prazo de locação [deste|do presente] contrato é de XX [meses]"
  /prazo\s+(?:de\s+loca[cç][aã]o\s+)?(?:deste|do\s+presente)?\s*contrato\s+(?:é|e|ser[áa])\s+de\s+(\d+)\s*(?:\(|meses)/i,
  // "vigência de XX meses"
  /vig[eê]ncia\s+(?:do\s+contrato\s+)?(?:é|e|ser[áa])?\s*de\s+(\d+)\s*(?:\(|meses)/i,
  // "vigorará pelo prazo de XX meses"
  /vigorar[áa]\s+pelo\s+prazo\s+de\s+(\d+)\s*(?:\(|meses)/i,
  // "prazo de XX meses"
  /\bprazo\s+(?:de\s+)?(\d+)\s*\(?\s*[a-záêç\s]*?\s*\)?\s*meses\b/i,
];

const DATE_RANGE_PATTERNS = [
  // Original written form: "iniciar-se no dia 01 de maio de 2026 e findar-se no dia 01 de maio de 2029"
  {
    pattern: /iniciar.se\s+no\s+dia\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\s+e\s+findar.se\s+no\s+dia\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/is,
    format: 'written' as const,
  },
  // Numeric: "com início em 01/05/2026 e término em 01/05/2029"
  {
    pattern: /(?:com\s+)?in[ií]cio\s+em\s+(\d{2}\/\d{2}\/\d{4})\s+e\s+t[eé]rmino\s+em\s+(\d{2}\/\d{2}\/\d{4})/i,
    format: 'numeric' as const,
  },
  // "do dia X ao dia Y" written
  {
    pattern: /do\s+dia\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})\s+(?:até|ao\s+dia)\s+(\d{1,2}\s+de\s+\w+\s+de\s+\d{4})/i,
    format: 'written' as const,
  },
];

const MONTH_MAP: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};

// Brazilian names can have lowercase particles (da, de, do, dos, das) and accents.
// We collect uppercase or title-case sequences with optional lowercase particles.
const NAME_BODY = String.raw`(?:[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç]+|d[aeo]s?|e)`;

const LANDLORD_PATTERNS = [
  // "LOCADOR(A): NAME" — until comma, "brasileir" (qualifier), CPF or "portador(a)"
  new RegExp(String.raw`LOCADOR[A]?\s*:?\s*((?:${NAME_BODY}\s*){2,})(?:,|\s+brasileir|\s+portador|\s+inscrit)`, 'i'),
  // Inline: "como LOCADOR(A) o sr/sra NAME"
  new RegExp(String.raw`como\s+LOCADOR[A]?[^A-Z]{0,30}((?:${NAME_BODY}\s*){2,})(?:,|\s+brasileir)`, 'i'),
];

const TENANT_PATTERNS = [
  new RegExp(String.raw`LOCAT[ÁA]RIO[A]?\s*:?\s*((?:${NAME_BODY}\s*){2,})(?:,|\s+brasileir|\s+portador|\s+inscrit)`, 'i'),
  new RegExp(String.raw`como\s+LOCAT[ÁA]RIO[A]?[^A-Z]{0,30}((?:${NAME_BODY}\s*){2,})(?:,|\s+brasileir)`, 'i'),
];

// PDF extraction often glues words together and produces odd line breaks. This
// normalizes whitespace without losing paragraph boundaries (preserved as \n).
function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function writtenDateToNumeric(s: string): string {
  const parts = s.replace(/\s+/g, ' ').trim().toLowerCase().split(' ');
  const day = parts[0].padStart(2, '0');
  const monthName = parts[2] || '';
  const year = parts[parts.length - 1];
  const month = MONTH_MAP[monthName] || '??';
  return `${day}/${month}/${year}`;
}

function firstMatch(text: string, patterns: RegExp[]): RegExpMatchArray | null {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m;
  }
  return null;
}

export class ParserService {
  static async parseContract(fileUrl: string) {
    try {
      let dataBuffer: Buffer;

      const mediaMatch = fileUrl.match(/\/api\/media\/([a-zA-Z0-9_-]+)/);
      if (mediaMatch) {
        const media: any = await Media.findById(mediaMatch[1]).lean();
        if (!media) {
          console.error('🤖 [AUTO PARSER] Media not found in DB:', mediaMatch[1]);
          return {};
        }
        dataBuffer = Buffer.isBuffer(media.data) ? media.data : (media.data?.buffer ?? Buffer.from(media.data ?? []));
      } else {
        let targetPath = fileUrl;
        if (fileUrl.includes('/uploads/')) {
          const fileName = fileUrl.split('/uploads/').pop();
          targetPath = path.join(process.cwd(), 'public/uploads', fileName!);
        }
        if (!fs.existsSync(targetPath)) {
          console.error('🤖 [AUTO PARSER] File not found:', targetPath);
          return {};
        }
        dataBuffer = fs.readFileSync(targetPath);
      }

      const data = await pdf(dataBuffer);
      const text = normalizeText(data.text);

      // Optional debug dump: enable with PARSER_DUMP=1 (off by default to avoid
      // writing contract text to the container disk on every parse).
      if (process.env.PARSER_DUMP === '1') {
        try { fs.writeFileSync(path.join(process.cwd(), 'last_extraction.txt'), text); } catch {}
      }

      const metadata: any = {};

      // ─── Names ─────────────────────────────────────────────────────────────
      const landlordMatch = firstMatch(text, LANDLORD_PATTERNS);
      if (landlordMatch) metadata.landlordName = landlordMatch[1].trim().replace(/\s+/g, ' ');

      const tenantMatch = firstMatch(text, TENANT_PATTERNS);
      if (tenantMatch) metadata.tenantName = tenantMatch[1].trim().replace(/\s+/g, ' ');

      // ─── Rent ──────────────────────────────────────────────────────────────
      const rentMatch = firstMatch(text, RENT_PATTERNS);
      if (rentMatch) {
        // Trim trailing punctuation like "4.000,00." or ","
        metadata.amount = rentMatch[1].replace(/[.,]+$/, '').trim();
      }

      // ─── Address ───────────────────────────────────────────────────────────
      const addressMatch = firstMatch(text, ADDRESS_PATTERNS);
      if (addressMatch) {
        metadata.address = addressMatch[1]
          .trim()
          .replace(/\s+/g, ' ')
          .replace(/[.,;]+$/, ''); // trim trailing punctuation
      }

      // ─── Duration + Date Range ────────────────────────────────────────────
      const durationMatch = firstMatch(text, DURATION_PATTERNS);
      if (durationMatch) {
        const months = durationMatch[1];

        // Try each date-range variant
        let startDateStr: string | null = null;
        let endDateStr: string | null = null;
        for (const { pattern, format } of DATE_RANGE_PATTERNS) {
          const m = text.match(pattern);
          if (m) {
            if (format === 'written') {
              startDateStr = writtenDateToNumeric(m[1]);
              endDateStr = writtenDateToNumeric(m[2]);
            } else {
              startDateStr = m[1];
              endDateStr = m[2];
            }
            break;
          }
        }

        if (startDateStr && endDateStr) {
          // Repair: if start === end but duration > 0, recompute end from start + months
          if (startDateStr === endDateStr && Number(months) > 0 && !startDateStr.includes('??')) {
            const [d, m, y] = startDateStr.split('/').map(Number);
            const date = new Date(y, m - 1, d);
            date.setMonth(date.getMonth() + Number(months));
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            endDateStr = `${dd}/${mm}/${yyyy}`;
            console.log(`🤖 [AUTO PARSER] Repaired end date from ${months} months: ${endDateStr}`);
          }
          metadata.duration = `${months} meses (${startDateStr} - ${endDateStr})`;
        } else {
          metadata.duration = `${months} meses`;
        }
      }

      // ─── Fallback start date ───────────────────────────────────────────────
      // Look for "início em DD/MM/YYYY" or "data de início" first, then the
      // first DD/MM/YYYY as last resort (was matching signature dates before).
      const startCtx = text.match(/(?:in[ií]cio|vig[eê]ncia|data\s+inicial)[^0-9]{0,40}(\d{2}\/\d{2}\/\d{4})/i);
      if (startCtx) {
        metadata.startDate = startCtx[1];
      } else {
        const anyDate = text.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (anyDate) metadata.startDate = anyDate[1];
      }

      console.log('🤖 [AUTO PARSER] Extracted Metadata:', metadata);
      return metadata;
    } catch (error) {
      console.error('🤖 [AUTO PARSER] Error parsing contract:', error);
      return {};
    }
  }
}
