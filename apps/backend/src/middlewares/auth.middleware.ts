import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role, RoleType } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export const authMiddleware = (roles: RoleType[] = [], requiredPermission?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const [, token] = authHeader.split(' ');

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      
      // Get roles from the comma-separated string
      const userRoles = (decoded.role || '').split(',').map((r: string) => r.trim());
      
      // Ensure the user belongs to the current tenant context
      if (req.tenantId && decoded.tenantId !== req.tenantId) {
        return res.status(403).json({ error: 'Access denied: User does not belong to this tenant' });
      }

      // 1. Role Check (Admin/Owner always bypass permission checks)
      const isSuperUser = userRoles.includes(Role.ADMIN) || userRoles.includes(Role.OWNER);
      
      if (!isSuperUser) {
        // 2. Role validation (check if ANY user role is in the allowed roles list)
        if (roles.length > 0 && !roles.some(r => userRoles.includes(r))) {
          return res.status(403).json({ error: 'Access denied: Insufficient role' });
        }

        // 3. Granular Permission Check for Operadores
        if (requiredPermission && (userRoles.includes(Role.TENANT) || userRoles.includes(Role.LANDLORD))) {
          const permissions = typeof decoded.permissions === 'string' 
            ? JSON.parse(decoded.permissions) 
            : decoded.permissions;
            
          if (!permissions[requiredPermission]) {
            return res.status(403).json({ error: `Access denied: Missing permission (${requiredPermission})` });
          }
        }
      }

      req.user = decoded;
      next();
    } catch (error: any) {
      console.error('🔒 [AUTH ERROR]:', error.message);
      return res.status(401).json({ error: 'Invalid or expired token', details: error.message });
    }
  };
};
