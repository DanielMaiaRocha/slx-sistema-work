declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      user?: any;
    }
  }
}

export {};
