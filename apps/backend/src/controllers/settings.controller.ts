import { Request, Response } from 'express';
import prisma from '../config/prisma';

export class SettingsController {
  static async getBranding(req: Request, res: Response) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId }
      });

      if (!tenant) return res.status(404).json({ error: 'Imobiliária não encontrada' });

      res.json({
        name: tenant.name,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        config: typeof tenant.config === 'string' ? JSON.parse(tenant.config) : (tenant.config || {})
      });
    } catch (error) {
      console.error('SettingsController.getBranding error:', error);
      res.status(500).json({ error: 'Erro ao buscar configurações.' });
    }
  }

  static async updateBranding(req: Request, res: Response) {
    const { name, logoUrl, primaryColor, secondaryColor, config } = req.body;

    try {
      const updated = await prisma.tenant.update({
        where: { id: req.tenantId },
        data: {
          name,
          logoUrl,
          primaryColor,
          secondaryColor,
          config: typeof config === 'object' ? JSON.stringify(config) : config
        }
      });

      res.json({ 
        message: 'Configurações salvas com sucesso', 
        data: {
          ...updated,
          config: typeof updated.config === 'string' ? JSON.parse(updated.config) : updated.config
        } 
      });
    } catch (error) {
      console.error('SettingsController.updateBranding error:', error);
      res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
  }
}
