import { Request, Response } from 'express';
import { DocumentModel, User } from '../models';
import { ParserService } from '../services/parser.service';

export class DocumentController {
  static async listMyDocuments(req: Request, res: Response) {
    const userId = req.user?.id;
    const tenantId = req.tenantId;
    const visibility = req.query.visibility as string | undefined;

    try {
      const filter: any = {
        userId,
        tenantId,
        deletedAt: null,
        type: { $not: /^CONTRACT/ },
      };

      if (visibility) {
        filter.visibility = { $in: [visibility, 'ALL'] };
      }

      const documents = await DocumentModel.find(filter).sort({ createdAt: -1 }).lean();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  }

  static async listUserDocuments(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const tenantId = req.tenantId;

    try {
      const user: any = await User.findOne({
        tenantId,
        $or: [
          { _id: userId },
          { asaasId: userId },
          { asaasId: userId.toUpperCase() },
          { asaasId: userId.toLowerCase() },
        ],
      }).lean();

      if (!user) return res.json([]);

      const documents = await DocumentModel.find({ userId: user._id, tenantId, deletedAt: null })
        .sort({ createdAt: -1 })
        .lean();

      res.json(documents);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user documents' });
    }
  }

  static async upload(req: Request, res: Response) {
    const { name, url, type, userId: targetUserId, visibility, address } = req.body;
    const currentUserId = req.user?.id;
    const tenantId = req.tenantId;

    const userId = targetUserId || currentUserId;
    if (!userId || !tenantId) return res.status(400).json({ error: 'Context missing' });

    try {
      const user: any = await User.findOne({
        tenantId,
        $or: [
          { _id: userId },
          { asaasId: userId },
          { asaasId: userId.toUpperCase() },
          { asaasId: userId.toLowerCase() },
        ],
      }).lean();

      if (!user) {
        console.error(`❌ [DOC UPLOAD] User ${userId} not found for tenant ${tenantId}`);
        return res.status(404).json({ error: 'User not found for this tenant' });
      }

      const document: any = await DocumentModel.create({
        name,
        url,
        type: type || 'OTHER',
        userId: user._id,
        tenantId,
        visibility: visibility || 'ALL',
        address: address || null,
      });

      if (type?.startsWith('CONTRACT')) {
        const metadata = await ParserService.parseContract(url);
        let amount = null;
        if (metadata.amount) {
          amount = parseFloat(metadata.amount.replace(/\./g, '').replace(',', '.'));
        }
        await DocumentModel.findByIdAndUpdate(document._id, {
          amount,
          address: address || metadata.address || null,
          duration: metadata.duration || null,
        });
      }

      res.status(201).json(document);
    } catch (error: any) {
      console.error('Document upload error:', error);
      res.status(500).json({ error: 'Failed to upload document', details: error.message });
    }
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { name, type, visibility, address } = req.body;
    const tenantId = req.tenantId;

    try {
      const document = await DocumentModel.findOneAndUpdate(
        { _id: id, tenantId },
        { name, type, visibility, address: address || null },
        { new: true }
      ).lean();
      if (!document) return res.status(404).json({ error: 'Document not found' });
      res.json(document);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update document' });
    }
  }

  static async delete(req: Request, res: Response) {
    const id = req.params.id as string;
    const tenantId = req.tenantId;

    try {
      const result = await DocumentModel.deleteOne({ _id: id, tenantId });
      if (result.deletedCount === 0) {
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
      const documents: any[] = await DocumentModel.find({ tenantId, deletedAt: null })
        .sort({ createdAt: -1 })
        .lean();

      const userIds = [...new Set(documents.map((d) => d.userId))];
      const users: any[] = await User.find({ _id: { $in: userIds } }).select({ _id: 1, name: 1 }).lean();
      const userById = new Map(users.map((u) => [u._id, u]));

      const enriched = documents.map((d) => ({ ...d, user: userById.get(d.userId) ? { name: userById.get(d.userId).name } : null }));

      res.json(enriched);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch all documents' });
    }
  }

  static async reparseUserContracts(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const tenantId = req.tenantId;

    try {
      let users: any[] = [];
      if (userId === 'all' || userId === 'ALL') {
        users = await User.find({ tenantId }).lean();
      } else {
        const user: any = await User.findOne({
          tenantId,
          $or: [{ _id: userId }, { asaasId: userId }, { asaasId: userId.toUpperCase() }],
        }).lean();
        if (user) users.push(user);
      }

      if (users.length === 0) return res.status(404).json({ error: 'User not found' });

      const allResults: any[] = [];
      for (const user of users) {
        const contracts: any[] = await DocumentModel.find({
          userId: user._id,
          tenantId,
          type: { $regex: '^CONTRACT' },
        }).lean();

        for (const doc of contracts) {
          try {
            const metadata = await ParserService.parseContract(doc.url);
            let amount = null;
            if (metadata.amount) {
              amount = parseFloat(metadata.amount.replace(/\./g, '').replace(',', '.'));
            }
            await DocumentModel.findByIdAndUpdate(doc._id, {
              amount,
              address: metadata.address || null,
              duration: metadata.duration || null,
            });
            allResults.push({ userName: user.name, docName: doc.name, status: 'success', metadata });
          } catch (err) {
            allResults.push({ userName: user.name, docName: doc.name, status: 'error' });
          }
        }
      }

      return res.json({ message: 'Reparsing complete', results: allResults });
    } catch (error) {
      console.error('🤖 [RE-PARSER] Global Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}
