import { Request, Response } from 'express';
import { Tenant } from '../models';

const normalizeLogoUrl = (logoUrl: string | null | undefined): string | null => {
  if (!logoUrl) return null;
  if (logoUrl.includes('/api/media/')) return logoUrl;
  if (logoUrl.startsWith('https://')) return logoUrl;
  return logoUrl;
};

export class SettingsController {
  static async getBranding(req: Request, res: Response) {
    try {
      const tenant: any = await Tenant.findById(req.tenantId).lean();

      if (!tenant) return res.status(404).json({ error: 'Imobiliária não encontrada', tenantId: req.tenantId });

      let parsedConfig: any = {};
      if (tenant.config) {
        try {
          parsedConfig = typeof tenant.config === 'string' ? JSON.parse(tenant.config) : tenant.config;
        } catch (parseErr: any) {
          console.error('SettingsController.getBranding config parse error:', parseErr, 'raw:', tenant.config);
          parsedConfig = {};
        }
      }

      res.json({
        name: tenant.name,
        logoUrl: normalizeLogoUrl(tenant.logoUrl),
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        config: parsedConfig
      });
    } catch (error: any) {
      console.error('SettingsController.getBranding error:', error);
      res.status(500).json({
        error: 'Erro ao buscar configurações.',
        details: error?.message,
        code: error?.code,
      });
    }
  }

  static async updateBranding(req: Request, res: Response) {
    const { name, logoUrl, primaryColor, secondaryColor, config } = req.body;

    try {
      const updated: any = await Tenant.findByIdAndUpdate(
        req.tenantId,
        {
          name,
          logoUrl: logoUrl || null,
          primaryColor,
          secondaryColor,
          config: typeof config === 'object' ? JSON.stringify(config) : config
        },
        { new: true }
      ).lean();

      if (!updated) return res.status(404).json({ error: 'Imobiliária não encontrada' });

      res.json({
        message: 'Configurações salvas com sucesso',
        data: {
          ...updated,
          logoUrl: normalizeLogoUrl(updated.logoUrl),
          config: typeof updated.config === 'string' ? JSON.parse(updated.config) : updated.config
        }
      });
    } catch (error) {
      console.error('SettingsController.updateBranding error:', error);
      res.status(500).json({ error: 'Erro ao salvar configurações.' });
    }
  }
}
