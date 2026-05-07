import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma';
import { AsaasService, asaasApi } from '../services/asaas.service';
import { EmailService } from '../services/email.service';
import { Role } from '@prisma/client';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class TenantAuthController {
  static async login(req: Request, res: Response) {
    const { cpf, password } = req.body;

    if (!cpf || !password) {
      return res.status(400).json({ error: 'CPF e senha são obrigatórios' });
    }

    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      const tenantId = req.tenantId;

      console.log(`🔑 [LOGIN ATTEMPT] CPF: ${cleanCpf}, Tenant: ${tenantId}`);

      const user = await prisma.user.findFirst({
        where: { 
          cpf: cleanCpf,
          tenantId: tenantId
        },
        include: { tenant: true }
      });

      if (user) {
        console.log(`👤 [USER FOUND] Roles: ${user.role}`);
      } else {
        console.log(`❌ [USER NOT FOUND] CPF: ${cleanCpf}`);
      }

      const allowedRoles = [Role.TENANT, Role.LANDLORD, Role.OWNER];
      const userRoles = user?.role.split(',') || [];
      const hasAllowedRole = userRoles.some(r => allowedRoles.includes(r.trim() as Role));

      if (!user || !hasAllowedRole) {
        return res.status(401).json({ error: 'Inquilino não encontrado' });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      const token = jwt.sign(
        { 
          id: user.id, 
          email: user.email, 
          role: user.role, 
          tenantId: user.tenantId,
          asaasId: user.asaasId,
          name: user.name
        },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          name: user.name, 
          role: user.role,
          asaasId: user.asaasId,
          tenant: {
            name: user.tenant?.name,
            logoUrl: user.tenant?.logoUrl
          }
        } 
      });
    } catch (error: any) {
      console.error('Tenant login error:', error);
      res.status(500).json({ error: 'Erro interno no servidor' });
    }
  }

  static async firstAccess(req: Request, res: Response) {
    const { cpf, email } = req.body;

    if (!cpf || !email) {
      return res.status(400).json({ error: 'CPF e E-mail são obrigatórios' });
    }

    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      
      // Check if user already exists
      let user = await prisma.user.findFirst({
        where: { cpf: cleanCpf }
      });

      // If user doesn't exist locally, look up in Asaas by CPF
      if (!user) {
        const asaasCustomer = await AsaasService.findCustomerByCpf(cleanCpf);

        if (!asaasCustomer) {
          return res.status(404).json({ error: 'CPF não encontrado na base de clientes' });
        }

        const firstTenant = await prisma.tenant.findFirst();
        if (!firstTenant) return res.status(500).json({ error: 'Sistema não configurado' });

        user = await prisma.user.create({
          data: {
            email: email, // Use the email provided by the user
            cpf: cleanCpf,
            name: asaasCustomer.name,
            phone: asaasCustomer.mobilePhone || asaasCustomer.phone,
            password: await bcrypt.hash(Math.random().toString(36), 10),
            role: Role.TENANT,
            asaasId: asaasCustomer.id,
            tenantId: firstTenant.id
          }
        });
      } else {
        // If user exists, update their email to the one provided
        user = await prisma.user.update({
          where: { id: user.id },
          data: { email: email }
        });
      }

      // Generate magic link token (valid for 1 hour)
      const token = jwt.sign({ id: user.id, type: 'first_access' }, JWT_SECRET, { expiresIn: '1h' });
      
      const isLandlord = user.role === 'LANDLORD' || user.role === 'OWNER';
      const areaPath = isLandlord ? 'proprietario' : 'inquilinos';
      const magicLink = `${FRONTEND_URL}/login/${areaPath}/primeiro-acesso/definir-senha?token=${token}`;

      // Send via Email
      await EmailService.sendMagicLink(email, user.name, magicLink);

      res.json({ 
        message: 'Link de acesso enviado com sucesso para seu e-mail!',
        magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined 
      });
    } catch (error: any) {
      console.error('❌ [First Access Error]:', error);
      
      // Handle Prisma unique constraint error
      if (error.code === 'P2002') {
        const field = error.meta?.target || 'e-mail';
        return res.status(400).json({ 
          error: `Este ${field} já está sendo utilizado por outra conta.` 
        });
      }

      res.status(500).json({ 
        error: 'Erro ao processar primeiro acesso',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  static async setPassword(req: Request, res: Response) {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e senha são obrigatórios' });
    }

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      if (decoded.type !== 'first_access') {
        return res.status(400).json({ error: 'Token inválido para esta operação' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { id: decoded.id },
        data: { password: hashedPassword }
      });

      res.json({ message: 'Senha definida com sucesso! Agora você já pode fazer login.' });
    } catch (error: any) {
      console.error('Set password error:', error);
      res.status(400).json({ error: 'Token expirado ou inválido' });
    }
  }
}
