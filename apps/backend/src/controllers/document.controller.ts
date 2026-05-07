import { Request, Response } from 'express';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

import { ParserService } from '../services/parser.service';

export class DocumentController {
  static async listMyDocuments(req: Request, res: Response) {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    const { visibility } = req.query; // Optional filter: "TENANT" or "LANDLORD"

    try {
      const where: any = { 
        userId, 
        tenantId, 
        deletedAt: null,
        NOT: {
          type: {
            startsWith: 'CONTRACT'
          }
        }
      };

      if (visibility) {
        where.visibility = { in: [visibility, 'ALL'] };
      }

      const documents = await prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  static async listUserDocuments(req: Request, res: Response) {
    const { userId } = req.params;
    const tenantId = req.tenantId;

    try {
      // Resolve user first (might be Asaas ID)
      const user = await prisma.user.findFirst({
        where: {
          tenantId,
          OR: [
            { id: userId },
            { asaasId: userId },
            { asaasId: userId.toUpperCase() },
            { asaasId: userId.toLowerCase() }
          ]
        }
      });

      if (!user) return res.json([]);

      const documents = await prisma.document.findMany({
        where: { userId: user.id, tenantId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user documents' });
    }
  }

  static async upload(req: Request, res: Response) {
    const { name, url, type, userId: targetUserId, visibility } = req.body;
    const currentUserId = req.user?.id;
    const tenantId = req.tenantId;

    // Use targetUserId if provided (admin case), otherwise use current user
    const userId = targetUserId || currentUserId;

    console.log('📄 [DOC UPLOAD] IDs received:', { userId, tenantId });

    if (!userId || !tenantId) return res.status(400).json({ error: 'Context missing' });

    try {
      // Verify user exists in the tenant - Support both local ID and Asaas ID
      const user = await prisma.user.findFirst({
        where: { 
          tenantId,
          OR: [
            { id: userId },
            { asaasId: userId },
            { asaasId: userId.toUpperCase() },
            { asaasId: userId.toLowerCase() }
          ]
        }
      });

      if (!user) {
        console.error(`❌ [DOC UPLOAD] User ${userId} not found for tenant ${tenantId}`);
        return res.status(404).json({ error: 'User not found for this tenant' });
      }

      const document = await prisma.document.create({
        data: {
          name,
          url,
          type: type || 'OTHER',
          userId: user.id, // Always use the Prisma local ID for the relationship
          tenantId,
          visibility: visibility || 'ALL'
        },
      });

      // Automated Parsing for Contracts
      if (type?.startsWith('CONTRACT')) {
        console.log(`🤖 [AUTO PARSER] Starting parsing for: ${name}`);
        const metadata = await ParserService.parseContract(url);
        console.log('🤖 [AUTO PARSER] Result:', metadata);
        
        let amount = null;
        if (metadata.amount) {
          amount = parseFloat(metadata.amount.replace(/\./g, '').replace(',', '.'));
        }

        await prisma.document.update({
          where: { id: document.id },
          data: {
            amount: amount,
            address: metadata.address || null,
            duration: metadata.duration || null
          }
        });
      }

      res.status(201).json(document);
    } catch (error: any) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document', details: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, type, visibility } = req.body;
    const tenantId = req.tenantId;

    try {
      const document = await prisma.document.update({
        where: { id, tenantId },
        data: { name, type, visibility }
      });
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const tenantId = req.tenantId;

    try {
      // Use deleteMany to filter by both ID and TenantId safely
      const result = await prisma.document.deleteMany({
        where: { id, tenantId }
      });

      if (result.count === 0) {
        return res.status(404).json({ error: 'Document not found or access denied' });
      }

      res.sendStatus(204);
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
    }
  }

  static async listAll(req: Request, res: Response) {
    const tenantId = req.tenantId;

    try {
      const documents = await prisma.document.findMany({
        where: { tenantId, deletedAt: null },
        include: {
          user: {
            select: { name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch all documents' });
    }
  }

  static async reparseUserContracts(req: Request, res: Response) {
    const { userId } = req.params;
    const tenantId = req.tenantId;

    try {
      let users = [];
      if (userId === 'all' || userId === 'ALL') {
        users = await prisma.user.findMany({ where: { tenantId } });
      } else {
        const user = await prisma.user.findFirst({
          where: {
            tenantId,
            OR: [{ id: userId }, { asaasId: userId }, { asaasId: userId.toUpperCase() }]
          }
        });
        if (user) users.push(user);
      }

      if (users.length === 0) return res.status(404).json({ error: 'User not found' });

      const allResults = [];
      for (const user of users) {
        const contracts = await prisma.document.findMany({
          where: { userId: user.id, tenantId, type: { startsWith: 'CONTRACT' } }
        });

        console.log(`🤖 [RE-PARSER] Found ${contracts.length} contracts for user ${user.name}`);

        for (const doc of contracts) {
          try {
            const metadata = await ParserService.parseContract(doc.url);
            
            // Parse amount (e.g. "4.000,00") to float
            let amount = null;
            if (metadata.amount) {
              amount = parseFloat(metadata.amount.replace(/\./g, '').replace(',', '.'));
            }

            await prisma.document.update({
              where: { id: doc.id },
              data: {
                amount: amount,
                address: metadata.address || null,
                duration: metadata.duration || null
              }
            });
            allResults.push({ userName: user.name, docName: doc.name, status: 'success', metadata });
          } catch (err) {
            allResults.push({ userName: user.name, docName: doc.name, status: 'error' });
          }
        }
      }

      return res.json({ message: "Reparsing complete", results: allResults });
    } catch (error) {
      console.error('🤖 [RE-PARSER] Global Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
