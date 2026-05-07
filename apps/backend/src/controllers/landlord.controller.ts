import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class LandlordController {
  static async getProperties(req: Request, res: Response) {
    const userId = (req as any).user?.id;
    const tenantId = (req as any).tenantId;

    try {
      const properties = await prisma.property.findMany({
        where: {
          landlordId: userId,
          tenantId,
          deletedAt: null
        }
      });

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
      // Find documents linked to this landlord user
      const documents = await prisma.document.findMany({
        where: {
          userId,
          tenantId,
          visibility: {
            in: ['LANDLORD', 'ALL']
          },
          deletedAt: null
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      res.json(documents);
    } catch (error: any) {
      console.error('Get landlord documents error:', error);
      res.status(500).json({ error: 'Erro ao buscar documentos' });
    }
  }
}
