import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // In production, this would resolve from the subdomain (req.hostname)
  // For local dev/flexibility, we'll use a header
  const tenantSlug = req.headers['x-tenant-slug'] as string;

  if (!tenantSlug) {
    return res.status(400).json({ error: 'Tenant identifier missing' });
  }

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true, slug: true }
    });

    if (!tenant && tenantSlug !== 'slx') {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // Use the actual ID from DB, or a known fallback for SLX if needed
    req.tenantId = tenant?.id || 'cmou5gbow0000loo04qgrzhmb';
    req.tenantSlug = tenant?.slug || 'slx';

    next();
  } catch (error) {
    console.warn('⚠️ Database unreachable. Using fallback for SLX.');
    if (tenantSlug === 'slx') {
      req.tenantId = 'cmou5gbow0000loo04qgrzhmb';
      req.tenantSlug = 'slx';
      return next();
    }
    res.status(500).json({ error: 'Database connection failed' });
  }
};
