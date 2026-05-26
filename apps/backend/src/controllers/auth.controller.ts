import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { Tenant, User } from '../models';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password, name, tenantSlug, role, permissions } = req.body;

    try {
      console.log('🚀 [Registration] Attempting to register:', { email, name, role });

      const finalRole = (role === 'USER') ? 'TENANT' : (role || 'TENANT');

      let tenant: any;
      if (tenantSlug) {
        tenant = await TenantRepository.findBySlug(tenantSlug);
      } else if (req.tenantId) {
        tenant = { _id: req.tenantId };
      } else {
        tenant = await Tenant.findOne().lean();
      }

      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const userExists = await UserRepository.findByEmail(email);
      if (userExists) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user: any = await UserRepository.create({
        email,
        password: hashedPassword,
        name,
        tenantId: tenant._id,
        role: finalRole,
        permissions: permissions ? JSON.stringify(permissions) : '{}'
      });

      res.status(201).json({
        message: 'Colaborador criado com sucesso!',
        user: { id: user._id, name: user.name, email: user.email }
      });
    } catch (error: any) {
      console.error('❌ [Registration Error]:', error);
      res.status(500).json({
        error: 'Falha ao cadastrar colaborador',
        details: error.message
      });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password, identifier, intendedRole } = req.body;
    const loginId = identifier || email;

    try {
      if (!loginId) {
        return res.status(400).json({ error: 'E-mail ou CPF é obrigatório' });
      }

      const cleanCpf = loginId.replace(/\D/g, '');

      const users: any[] = await User.find({
        $or: [{ email: loginId }, { cpf: cleanCpf }],
        deletedAt: null,
      }).lean();

      if (users.length === 0) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      let primaryUser: any = null;
      for (const u of users) {
        if (await bcrypt.compare(password, u.password)) {
          primaryUser = u;
          break;
        }
      }

      if (!primaryUser) {
        return res.status(401).json({ error: 'Senha inválida' });
      }

      const allRoles = (primaryUser.role || '').split(',').map((r: string) => r.trim());

      if (intendedRole && !allRoles.includes(intendedRole) && !allRoles.includes('ADMIN') && !allRoles.includes('OWNER')) {
        return res.status(403).json({
          error: `Você não possui acesso ao portal de ${intendedRole === 'TENANT' ? 'Inquilinos' : 'Proprietários'}.`
        });
      }

      let sessionRole = primaryUser.role;
      if (intendedRole && (allRoles.includes(intendedRole) || allRoles.includes('ADMIN'))) {
        sessionRole = allRoles.includes('ADMIN') ? primaryUser.role : intendedRole;
      }

      const userPermissions = typeof primaryUser.permissions === 'string'
        ? JSON.parse(primaryUser.permissions)
        : (primaryUser.permissions || {});

      const token = jwt.sign(
        {
          id: primaryUser._id,
          email: primaryUser.email,
          role: sessionRole,
          tenantId: primaryUser.tenantId,
          permissions: userPermissions
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({
        token,
        user: {
          id: primaryUser._id,
          email: primaryUser.email,
          role: sessionRole,
          name: primaryUser.name,
          permissions: userPermissions
        }
      });
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Erro ao realizar login.',
        details: error?.message,
        code: error?.code,
      });
    }
  }

  static async verifyEmail(req: Request, res: Response) {
    const { token } = req.query;

    try {
      const decoded = jwt.verify(token as string, JWT_SECRET) as any;
      await UserRepository.update(decoded.id, { isEmailVerified: true });
      res.json({ message: 'Email verified successfully' });
    } catch (error) {
      res.status(400).json({ error: 'Invalid or expired token' });
    }
  }
}
