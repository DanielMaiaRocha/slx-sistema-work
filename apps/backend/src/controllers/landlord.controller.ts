import { Request, Response } from 'express';
import { Property, DocumentModel } from '../models';

// Brazilian address variants are messy: "Rua X, 100, Centro" vs "Rua X nº 100
// Centro - SP" vs "R. X, 100 - Centro". Strip prefixes/punctuation and collapse
// whitespace before comparing so a contract's parsed address can still match
// the property address it actually refers to.
function normalizeAddress(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/\b(rua|r\.|av\.?|avenida|tv\.?|travessa|alameda|estrada|rod\.?|rodovia|al\.?)\b/g, '')
    .replace(/\b(n[º°o]?|no|n)\s*\d/g, (m) => m.replace(/\b(n[º°o]?|no|n)\s*/g, '')) // keep number, drop "nº"
    .replace(/[,./;:\-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// True if a and b share a non-trivial prefix (>= 12 chars) after normalization.
// We don't need a perfect match — just enough to identify the same property.
function addressMatches(a: string, b: string): boolean {
  const na = normalizeAddress(a);
  const nb = normalizeAddress(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const shorter = na.length < nb.length ? na : nb;
  const longer = na.length < nb.length ? nb : na;
  return shorter.length >= 12 && longer.startsWith(shorter);
}

export class LandlordController {
  static async getProperties(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).tenantId;

    try {
      const properties: any[] = await Property.find({
        landlordId: userId,
        tenantId,
        deletedAt: null,
      }).lean();

      // Find all contracts in this multi-tenant scope. We resolve match by
      // address rather than by storing a propertyId on Document, because the
      // existing data has neither — and parsing already gives us the address.
      const contracts: any[] = await DocumentModel.find({
        tenantId,
        type: { $regex: '^CONTRACT', $options: 'i' },
        deletedAt: null,
      }).lean();

      const enriched = properties.map((p) => {
        const match = contracts.find((c) => addressMatches(c.address, p.address));
        if (!match) return p;
        return {
          ...p,
          contract: {
            id: match._id,
            name: match.name,
            url: match.url,
            amount: match.amount ?? null,
            address: match.address ?? null,
            duration: match.duration ?? null,
            // The locatário (inquilino) is taken from the parsed contract PDF —
            // the Document's userId is whoever the contract was filed under
            // (usually the proprietário), so it must NOT be used as the tenant.
            tenantName: match.tenantName ?? null,
            tenantCpf: match.tenantCpf ?? null,
            startDate: match.startDate ?? null,
            endDate: match.endDate ?? null,
            createdAt: match.createdAt,
          },
        };
      });

      res.json(enriched);
    } catch (error: any) {
      console.error('Get properties error:', error);
      res.status(500).json({ error: 'Erro ao buscar imóveis' });
    }
  }

  static async getDocuments(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).tenantId;

    try {
      const documents = await DocumentModel.find({
        userId,
        tenantId,
        visibility: { $in: ['LANDLORD', 'ALL'] },
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .lean();

      res.json(documents);
    } catch (error: any) {
      console.error('Get landlord documents error:', error);
      res.status(500).json({ error: 'Erro ao buscar documentos' });
    }
  }
}
