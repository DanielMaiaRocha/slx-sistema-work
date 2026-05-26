import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../models';

export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const tenantSlug = req.headers['x-tenant-slug'] as string;

  if (!tenantSlug) {
    return res.status(400).json({ error: 'Tenant identifier missing' });
  }

  try {
    const tenant: any = await Tenant.findOne({ slug: tenantSlug }).select({ _id: 1, slug: 1 }).lean();

    if (!tenant && tenantSlug !== 'slx') {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    req.tenantId = (tenant?._id as string) || 'cmou5gbow0000loo04qgrzhmb';
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
