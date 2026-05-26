import { Request, Response } from 'express';
import {
  Inspection,
  InspectionRoom,
  InspectionItem,
  InspectionPhoto,
  InspectionVideo,
  Tenant,
  User,
} from '../models';
import { PDFService } from '../services/pdf.service';

async function loadInspectionWithChildren(id: string) {
  const inspection: any = await Inspection.findById(id).lean();
  if (!inspection) return null;

  const rooms: any[] = await InspectionRoom.find({ inspectionId: id }).sort({ order: 1 }).lean();
  const roomIds = rooms.map((r) => r._id);

  const [items, roomPhotos, roomVideos] = await Promise.all([
    InspectionItem.find({ roomId: { $in: roomIds } }).lean(),
    InspectionPhoto.find({ roomId: { $in: roomIds }, itemId: null }).lean(),
    InspectionVideo.find({ roomId: { $in: roomIds }, itemId: null }).lean(),
  ]);

  const itemIds = items.map((i: any) => i._id);
  const [itemPhotos, itemVideos] = await Promise.all([
    InspectionPhoto.find({ itemId: { $in: itemIds } }).lean(),
    InspectionVideo.find({ itemId: { $in: itemIds } }).lean(),
  ]);

  const itemsByRoom = new Map<string, any[]>();
  for (const it of items) {
    const list = itemsByRoom.get(it.roomId) || [];
    const itemPhotosForItem = itemPhotos.filter((p: any) => p.itemId === it._id);
    const itemVideosForItem = itemVideos.filter((v: any) => v.itemId === it._id);
    list.push({ ...it, id: it._id, photos: itemPhotosForItem.map((p: any) => ({ ...p, id: p._id })), videos: itemVideosForItem.map((v: any) => ({ ...v, id: v._id })) });
    itemsByRoom.set(it.roomId, list);
  }

  const roomsHydrated = rooms.map((r: any) => ({
    ...r,
    id: r._id,
    items: itemsByRoom.get(r._id) || [],
    photos: roomPhotos.filter((p: any) => p.roomId === r._id).map((p: any) => ({ ...p, id: p._id })),
    videos: roomVideos.filter((v: any) => v.roomId === r._id).map((v: any) => ({ ...v, id: v._id })),
  }));

  return { ...inspection, id: inspection._id, rooms: roomsHydrated };
}

export class InspectionController {
  static async listAll(req: Request, res: Response) {
    try {
      const inspections: any[] = await Inspection.find({ tenantId: req.tenantId })
        .sort({ createdAt: -1 })
        .lean();

      const userIds = [...new Set(inspections.map((i) => i.userId))];
      const users: any[] = await User.find({ _id: { $in: userIds } }).select({ _id: 1, name: 1 }).lean();
      const userById = new Map(users.map((u) => [u._id, u]));

      const enriched = inspections.map((i) => ({
        ...i,
        id: i._id,
        user: userById.get(i.userId) ? { name: userById.get(i.userId).name } : null,
      }));

      res.json(enriched);
    } catch (error) {
      console.error('InspectionController.listAll error:', error);
      res.status(500).json({ error: 'Erro ao buscar vistorias.' });
    }
  }

  static async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const inspection = await loadInspectionWithChildren(id);
      if (!inspection) return res.status(404).json({ error: 'Vistoria não encontrada.' });
      res.json(inspection);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao buscar vistoria.' });
    }
  }

  static async create(req: Request, res: Response) {
    const { propertyAddress, propertyNumber, cep, propertyType, landlordData, tenantData, inspectorData, status } = req.body;
    try {
      const inspection: any = await Inspection.create({
        propertyAddress,
        propertyNumber,
        cep,
        propertyType,
        landlordData: typeof landlordData === 'object' ? JSON.stringify(landlordData) : landlordData,
        tenantData: typeof tenantData === 'object' ? JSON.stringify(tenantData) : tenantData,
        inspectorData: typeof inspectorData === 'object' ? JSON.stringify(inspectorData) : inspectorData,
        status: status || 'DRAFT',
        tenantId: req.tenantId,
        userId: (req as any).user.id,
      });
      res.json(inspection);
    } catch (error: any) {
      console.error('InspectionController.create error:', error);
      res.status(500).json({
        error: 'Erro ao criar vistoria.',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      });
    }
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { propertyAddress, propertyNumber, cep, propertyType, landlordData, tenantData, inspectorData, status } = req.body;

    try {
      await Inspection.findByIdAndUpdate(id, {
        propertyAddress,
        propertyNumber,
        cep,
        propertyType,
        landlordData: typeof landlordData === 'object' ? JSON.stringify(landlordData) : landlordData,
        tenantData: typeof tenantData === 'object' ? JSON.stringify(tenantData) : tenantData,
        inspectorData: typeof inspectorData === 'object' ? JSON.stringify(inspectorData) : inspectorData,
        status,
      });

      await PDFService.deleteInspectionPDF(id);
      res.json({ message: 'Vistoria atualizada com sucesso.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar vistoria.' });
    }
  }

  static async addRoom(req: Request, res: Response) {
    const inspectionId = req.params.inspectionId as string;
    const { name, order } = req.body;
    try {
      const room = await InspectionRoom.create({ name, order: order || 0, inspectionId });
      await PDFService.deleteInspectionPDF(inspectionId);
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao adicionar cômodo.' });
    }
  }

  static async updateRoom(req: Request, res: Response) {
    const roomId = req.params.roomId as string;
    const { name, order } = req.body;
    try {
      const room: any = await InspectionRoom.findByIdAndUpdate(roomId, { name, order }, { new: true }).lean();
      if (!room) return res.status(404).json({ error: 'Cômodo não encontrado.' });
      await PDFService.deleteInspectionPDF(room.inspectionId);
      res.json(room);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar cômodo.' });
    }
  }

  static async deleteRoom(req: Request, res: Response) {
    const roomId = req.params.roomId as string;
    try {
      const room: any = await InspectionRoom.findById(roomId).lean();
      if (room) {
        const items: any[] = await InspectionItem.find({ roomId }).select({ _id: 1 }).lean();
        const itemIds = items.map((i) => i._id);

        await InspectionPhoto.deleteMany({ $or: [{ roomId }, { itemId: { $in: itemIds } }] });
        await InspectionVideo.deleteMany({ $or: [{ roomId }, { itemId: { $in: itemIds } }] });
        await InspectionItem.deleteMany({ roomId });
        await InspectionRoom.deleteOne({ _id: roomId });

        await PDFService.deleteInspectionPDF(room.inspectionId);
      }
      res.json({ message: 'Cômodo removido.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover cômodo.' });
    }
  }

  static async addItem(req: Request, res: Response) {
    const roomId = req.params.roomId as string;
    const { description, status, observations, videoUrl } = req.body;
    try {
      const item = await InspectionItem.create({ description, status, observations, videoUrl, roomId });
      const room: any = await InspectionRoom.findById(roomId).lean();
      if (room) await PDFService.deleteInspectionPDF(room.inspectionId);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao adicionar item.' });
    }
  }

  static async updateItem(req: Request, res: Response) {
    const itemId = req.params.itemId as string;
    const { description, status, observations, videoUrl } = req.body;
    try {
      const item: any = await InspectionItem.findByIdAndUpdate(
        itemId,
        { description, status, observations, videoUrl },
        { new: true }
      ).lean();
      if (!item) return res.status(404).json({ error: 'Item não encontrado.' });
      const room: any = await InspectionRoom.findById(item.roomId).lean();
      if (room) await PDFService.deleteInspectionPDF(room.inspectionId);
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: 'Erro ao atualizar item.' });
    }
  }

  static async deleteItem(req: Request, res: Response) {
    const itemId = req.params.itemId as string;
    try {
      const item: any = await InspectionItem.findById(itemId).lean();
      if (item) {
        await InspectionPhoto.deleteMany({ itemId });
        await InspectionVideo.deleteMany({ itemId });
        await InspectionItem.deleteOne({ _id: itemId });

        const room: any = await InspectionRoom.findById(item.roomId).lean();
        if (room) await PDFService.deleteInspectionPDF(room.inspectionId);
      }
      res.json({ message: 'Item removido.' });
    } catch (error) {
      res.status(500).json({ error: 'Erro ao remover item.' });
    }
  }

  static async generatePdf(req: Request, res: Response) {
    const id = req.params.id as string;
    try {
      const inspection: any = await loadInspectionWithChildren(id);
      if (!inspection) return res.status(404).json({ error: 'Vistoria não encontrada.' });

      const user: any = await User.findById(inspection.userId).select({ name: 1, creci: 1 }).lean();
      inspection.user = user ? { name: user.name, creci: user.creci } : null;

      const tenant: any = await Tenant.findById(req.tenantId).lean();
      const branding = tenant
        ? {
            name: tenant.name,
            logoUrl: tenant.logoUrl,
            primaryColor: tenant.primaryColor,
            config: JSON.parse(tenant.config || '{}'),
          }
        : {};

      const url = await PDFService.generateInspectionPDF(inspection, branding);
      res.json({ url });
    } catch (error) {
      console.error('generatePdf error:', error);
      res.status(500).json({ error: 'Erro ao gerar PDF.' });
    }
  }
}
