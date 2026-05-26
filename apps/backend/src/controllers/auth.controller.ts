import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRepository } from '../repositories/user.repository';
import { TenantRepository } from '../repositories/tenant.repository';
import { EmailService } from '../services/email.service';
import prisma from '../config/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

export class AuthController {
  static async register(req: Request, res: Response) {
    const { email, password, name, tenantSlug, role, permissions } = req.body;

    try {
      console.log('🚀 [Registration] Attempting to register:', { email, name, role });
      
      // Safety mapping: USER is not in DB enum, map to TENANT (Operador)
      const finalRole = (role === 'USER') ? 'TENANT' : (role || 'TENANT');

      // Find tenant (fallback to first tenant if slug not provided, e.g. from Team page)
      let tenant;
      if (tenantSlug) {
        tenant = await TenantRepository.findBySlug(tenantSlug);
      } else if (req.tenantId) {
        tenant = { id: req.tenantId };
      } else {
        const tenants = await prisma.tenant.findMany({ take: 1 });
        tenant = tenants[0];
      }

      if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

      const userExists = await UserRepository.findByEmail(email);
      if (userExists) return res.status(400).json({ error: 'User already exists' });

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await UserRepository.create({
        email,
        password: hashedPassword,
        name,
        tenantId: tenant.id,
        role: finalRole,
        permissions: permissions ? JSON.stringify(permissions) : '{}'
      });

      /* Email service disabled for now per user request
      try {
        const verificationToken = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '1d' });
        await EmailService.sendVerificationEmail(email, verificationToken);
      } catch (emailError: any) {
        console.warn('⚠️ [Registration] User created but verification email failed:', emailError.message);
      }
      */

      res.status(201).json({ 
        message: 'Colaborador criado com sucesso!',
        user: { id: user.id, name: user.name, email: user.email }
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

      // Check if identifier is CPF (numbers only or formatted)
      const cleanCpf = loginId.replace(/\D/g, '');
      const isCpf = cleanCpf.length === 11;

      const users = await prisma.user.findMany({
        where: { 
          OR: [
            { email: loginId },
            { cpf: cleanCpf }
          ],
          deletedAt: null 
        }
      });
      
      if (users.length === 0) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      // Find record with correct password
      let primaryUser = null;
      for (const u of users) {
        if (await bcrypt.compare(password, u.password)) {
          primaryUser = u;
          break;
        }
      }

      if (!primaryUser) {
        return res.status(401).json({ error: 'Senha inválida' });
      }

      // Restrict roles based on intended portal if provided
      const allRoles = primaryUser.role.split(',').map(r => r.trim());
      
      if (intendedRole && !allRoles.includes(intendedRole) && !allRoles.includes('ADMIN') && !allRoles.includes('OWNER')) {
        return res.status(403).json({ 
          error: `Você não possui acesso ao portal de ${intendedRole === 'TENANT' ? 'Inquilinos' : 'Proprietários'}.` 
        });
      }

      // If logging into a specific portal, only include that role in the token for that session
      // unless they are Admin
      let sessionRole = primaryUser.role;
      if (intendedRole && (allRoles.includes(intendedRole) || allRoles.includes('ADMIN'))) {
        sessionRole = allRoles.includes('ADMIN') ? primaryUser.role : intendedRole;
      }

      const userPermissions = typeof primaryUser.permissions === 'string' 
        ? JSON.parse(primaryUser.permissions) 
        : (primaryUser.permissions || {});

      const token = jwt.sign(
        { 
          id: primaryUser.id, 
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
          id: primaryUser.id, 
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
        meta: error?.meta,
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
