import { Request, Response } from 'express';
import { Property, DocumentModel } from '../models';

export class LandlordController {
  static async getProperties(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).tenantId;

    try {
      const properties = await Property.find({
        landlordId: userId,
        tenantId,
        deletedAt: null,
      }).lean();

      res.json(properties);
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
