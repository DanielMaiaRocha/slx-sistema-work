import { Request, Response } from 'express';
import prisma from '../config/prisma';

// Get API URL from environment or use production URL
const getApiUrl = () => {
  return process.env.API_URL || 'https://slx-sistema-work-production.up.railway.app';
};

// Helper function to normalize logo URL to use production API URL
const normalizeLogoUrl = (logoUrl: string | null | undefined): string | null => {
  if (!logoUrl) return null;
  
  // If it's already a full HTTPS URL, keep it
  if (logoUrl.startsWith('https://')) {
    return logoUrl;
  }
  
  // If it's an HTTP localhost URL, replace with production URL
  if (logoUrl.includes('localhost') || logoUrl.startsWith('http://')) {
    const filename = logoUrl.split('/').pop();
    return `${getApiUrl()}/uploads/${filename}`;
  }
  
  // If it's just a path, make it full URL
  if (logoUrl.startsWith('/uploads/')) {
    return `${getApiUrl()}${logoUrl}`;
  }
  
  // Otherwise, assume it's a filename
  return `${getApiUrl()}/uploads/${logoUrl}`;
};

export class SettingsController {
  static async getBranding(req: Request, res: Response) {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: req.tenantId }
      });

      if (!tenant) return res.status(404).json({ error: 'Imobiliária não encontrada' });

      res.json({
        name: tenant.name,
        logoUrl: normalizeLogoUrl(tenant.logoUrl),
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
      // Normalize the logo URL before saving
      const normalizedLogoUrl = normalizeLogoUrl(logoUrl);

      const updated = await prisma.tenant.update({
        where: { id: req.tenantId },
        data: {
          name,
          logoUrl: normalizedLogoUrl,
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
