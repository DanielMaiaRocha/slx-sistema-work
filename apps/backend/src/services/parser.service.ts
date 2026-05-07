import path from 'path';
import fs from 'fs';
const pdf = require('pdf-parse');

export class ParserService {
  static async parseContract(fileUrl: string) {
    try {
      // Resolve local path from URL
      let targetPath = fileUrl;
      if (fileUrl.startsWith('http://localhost:3001/uploads/')) {
        const fileName = fileUrl.split('/').pop();
        targetPath = path.join(process.cwd(), 'public/uploads', fileName!);
      }

      console.log('🤖 [AUTO PARSER] Target Path:', targetPath);

      if (!fs.existsSync(targetPath)) {
        console.error('🤖 [AUTO PARSER] File not found:', targetPath);
        return {};
      }

      const dataBuffer = fs.readFileSync(targetPath);
      const data = await pdf(dataBuffer);
      const text = data.text;

      // Save full text for debugging
      fs.writeFileSync(path.join(process.cwd(), 'last_extraction.txt'), text);

      const metadata: any = {};

      // Refined patterns based on real contract content
      const patterns = {
        // Matches "valor de R$4.000,00" or "valor de R$ 450,00" (with or without space after R$)
        rent: /valor\s+de\s+R\$\s*([\d.,]+)/i,
        // Matches address after "situado na/no/à" - stops at sentence end
        address: /situado\s+(?:na|no|à)\s+([\s\S]+?)(?=\.\s+(?:[A-Z]|Parágrafo|Cláusula|•|$))/i,
        // SPECIFIC to the lease duration clause - avoids matching insurance/other mentions
        // Matches: "prazo de locação deste contrato é de 36 (trinta e seis) meses"
        durationClause: /prazo\s+de\s+loca[cç][aã]o\s+deste\s+contrato\s+[eé]\s+de\s+(\d+)/i,
        // Date range: "iniciar-se no dia 01 de maio de 2026 e findar-se no dia 01 de maio de 2029"
        dateRange: /iniciar.se\s+no\s+dia\s+(\d{2}[\w\s]+?\d{4})\s+e\s+findar.se\s+no\s+dia\s+(\d{2}[\w\s]+?\d{4})/is,
        // Start date fallback (DD/MM/YYYY)
        startDate: /(\d{2}\/\d{2}\/\d{4})/,
        // Name extraction
        landlord: /LOCADOR[A]?:\s*([A-Z\s]+?)(?:,|\s+brasileir)/i,
        tenant: /LOCATÁRIO[A]?:\s*([A-Z\s]+?)(?:,|\s+brasileir)/i
      };

      // Extract Names
      const landlordMatch = text.match(patterns.landlord);
      if (landlordMatch) {
        metadata.landlordName = landlordMatch[1].trim();
      }
      const tenantMatch = text.match(patterns.tenant);
      if (tenantMatch) {
        metadata.tenantName = tenantMatch[1].trim();
      }

      // Extract Rent (amount as string like "4.000,00" — controller converts to float)
      const rentMatch = text.match(patterns.rent);
      if (rentMatch) {
        metadata.amount = rentMatch[1].trim();
      }

      // Extract Address
      const addressMatch = text.match(patterns.address);
      if (addressMatch) {
        metadata.address = addressMatch[1].trim().replace(/\s+/g, ' ');
      }

      // Extract Duration - targets the actual lease duration clause specifically
      const durationMatch = text.match(patterns.durationClause);
      if (durationMatch) {
        const months = durationMatch[1];
        // Try to build full duration string with start/end dates
        const dateRangeMatch = text.match(patterns.dateRange);
        if (dateRangeMatch) {
          const monthMap: Record<string, string> = {
            janeiro: '01', fevereiro: '02', março: '03', marco: '03',
            abril: '04', maio: '05', junho: '06', julho: '07',
            agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
          };
          const toDate = (s: string) => {
            const clean = s.replace(/\s+/g, ' ').trim();
            const parts = clean.split(' ');
            const day = parts[0].padStart(2, '0');
            const monthName = (parts[2] || '').toLowerCase();
            // "01 de maio de 2026" → parts = ["01","de","maio","de","2026"], year is last
            const year = parts[parts.length - 1];
            const month = monthMap[monthName] || '??';
            return `${day}/${month}/${year}`;
          };

          let startDateStr = toDate(dateRangeMatch[1]);
          let endDateStr = toDate(dateRangeMatch[2]);

          // Fix for documents with typos (start and end date are the same but duration is > 0)
          if (startDateStr === endDateStr && Number(months) > 0 && !startDateStr.includes('??')) {
            const [d, m, y] = startDateStr.split('/').map(Number);
            const date = new Date(y, m - 1, d);
            date.setMonth(date.getMonth() + Number(months));
            
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            endDateStr = `${dd}/${mm}/${yyyy}`;
            console.log(`🤖 [AUTO PARSER] Repaired identical end date based on ${months} months: ${endDateStr}`);
          }

          metadata.duration = `${months} meses (${startDateStr} - ${endDateStr})`;
        } else {
          metadata.duration = `${months} meses`;
        }
      }

      // Extract Start Date (first DD/MM/YYYY in text, as fallback)
      const dateMatch = text.match(patterns.startDate);
      if (dateMatch) {
        metadata.startDate = dateMatch[1];
      }

      console.log('🤖 [AUTO PARSER] Extracted Metadata:', metadata);
      return metadata;
    } catch (error) {
      console.error('🤖 [AUTO PARSER] Error parsing contract:', error);
      return {};
    }
  }
}
