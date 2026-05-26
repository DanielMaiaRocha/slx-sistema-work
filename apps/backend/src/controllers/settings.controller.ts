import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Logo URLs are now stored as /api/media/:id paths.
// This helper just returns the stored value as-is (it's already a relative path).
// For legacy localhost URLs, it extracts the media id or returns null.
const normalizeLogoUrl = (logoUrl: string | null | undefined): string | null => {
  if (!logoUrl) return null;
  
  // New format: /api/media/:id — return as-is
  if (logoUrl.includes('/api/media/')) {
    return logoUrl;
  }

  // If it's already a full HTTPS URL, keep it (backwards compat)
  if (logoUrl.startsWith('https://')) {
    return logoUrl;
  }

  // Legacy localhost/relative URLs — return as-is (frontend getAssetUrl handles these)
  return logoUrl;
};

export class SettingsController {
  static async getBranding(req: Request, res: Response) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId }
      });

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
        meta: error?.meta,
      });
    }
  }

  static async updateBranding(req: Request, res: Response) {
    const { name, logoUrl, primaryColor, secondaryColor, config } = req.body;

    try {
      const updated = await prisma.tenant.update({
        where: { id: req.tenantId },
        data: {
          name,
          logoUrl: logoUrl || null,
          primaryColor,
          secondaryColor,
          config: typeof config === 'object' ? JSON.stringify(config) : config
        }
      });

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
