import { User } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
      user?: Partial<User>;
    }
  }
}
