import { Request, Response } from 'express';
import { asaasApi } from '../services/asaas.service';
import prisma from '../config/prisma';
import { Role } from '@prisma/client';

import bcrypt from 'bcryptjs';

export class UserController {
  static async create(req: Request, res: Response) {
    const { name, email, password, phone, role, cpf, properties } = req.body;
    const tenantId = req.tenantId;

    try {
      if (!email || !name) {
        return res.status(400).json({ error: 'Campos obrigatórios: nome e email.' });
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(password || 'FIRST_ACCESS_PENDING', 10);

      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone,
          role: role || 'LANDLORD',
          cpf,
          tenantId: tenantId!,
          isEmailVerified: true
        }
      });

      // Create properties if provided
      if (properties && Array.isArray(properties)) {
        for (const prop of properties) {
          if (prop.address) {
            await prisma.property.create({
              data: {
                address: prop.address,
                neighborhood: prop.neighborhood || '',
                city: prop.city || '',
                state: prop.state || 'RJ',
                landlordId: user.id,
                tenantId: tenantId!
              }
            });
          }
        }
      }

      res.status(201).json({ message: 'Usuário criado com sucesso', user });
    } catch (error: any) {
      console.error('UserController.create error:', error);
      res.status(500).json({ error: 'Falha ao criar usuário.', details: error.message });
    }
  }

  static async listTeam(req: Request, res: Response) {
    try {
      const users = await prisma.user.findMany({
        where: { 
          tenantId: req.tenantId,
          asaasId: null, // Internal team members don't have Asaas ID
          deletedAt: null
        },
        orderBy: { createdAt: 'desc' }
      });
      res.json({ data: users });
    } catch (error) {
      console.error('UserController.listTeam error:', error);
      res.status(500).json({ error: 'Falha ao buscar equipe.' });
    }
  }

  static async listAll(req: Request, res: Response) {
    const { offset = 0, limit = 20, search, role } = req.query;

    try {
      const asaasParams: any = { offset, limit };
      if (role) asaasParams.groupName = role;
      
      let s = '';
      if (search) {
        s = search.toString();
        if (s.includes('@')) asaasParams.email = s;
        else if (/^\d+$/.test(s.replace(/[-. /]/g, ''))) asaasParams.cpfCnpj = s.replace(/[-. /]/g, '');
        else asaasParams.name = s;
      }

      const asaasResponse = await asaasApi.get('/customers', { params: asaasParams });
      const customers = asaasResponse.data.data || [];
      const totalCount = asaasResponse.data.totalCount;

      const localUsers = await prisma.user.findMany({ 
        where: { 
          tenantId: req.tenantId,
          deletedAt: null 
        } 
      });

      // Merge Asaas and Local
      const formatted = customers.map((c: any) => {
        const local = localUsers.find(u => u.asaasId === c.id);
        return {
          id: c.id, // Primary UI ID is Asaas ID for synced users
          name: local?.name || c.name,
          email: c.email || 'N/A',
          phone: local?.phone || c.mobilePhone || c.phone || 'N/A',
          cpfCnpj: c.cpfCnpj || 'N/A',
          role: local?.role || c.groupName || 'Inquilino',
          status: 'Ativo',
          isLocalOverride: !!local
        };
      });

      // Add Local-only users (like manually created landlords)
      if (offset === 0) {
        const localOnly = localUsers.filter(u => !u.asaasId).map(u => ({
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone || 'N/A',
          cpfCnpj: u.cpf || 'N/A',
          role: u.role,
          status: 'Ativo',
          isLocalOverride: true
        }));
        
        // Filter localOnly by search if needed
        const filteredLocal = search ? localOnly.filter(u => 
          u.name.toLowerCase().includes(s.toLowerCase()) || 
          u.email.toLowerCase().includes(s.toLowerCase())
        ) : localOnly;

        formatted.unshift(...filteredLocal);
      }
      
      res.json({ 
        data: formatted, 
        pagination: { total: totalCount + (offset === 0 ? 0 : 0), offset: Number(offset), limit: Number(limit) }
      });
    } catch (error) {
      console.error('UserController.listAll error:', error);
      res.status(500).json({ error: 'Falha ao buscar usuários.' });
    }
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const { name, email, password, role, phone, permissions } = req.body;

    try {
      const data: any = { 
        name: name === 'N/A' ? undefined : name, 
        email: email === 'N/A' ? undefined : email, 
        role, 
        phone: (phone === 'N/A' || !phone) ? null : phone.replace(/\D/g, '')
      };
      
      if (password && password !== 'NO_PASSWORD_MANAGED_LOCALLY') {
        data.password = await bcrypt.hash(password, 10);
      }

      if (permissions) {
        data.permissions = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
      }

      const normalizedId = id.toUpperCase();
      const isAsaasId = normalizedId.startsWith('CUS_');

      // 1. Try to find user by Asaas ID or Internal ID
      const existing = await prisma.user.findFirst({
        where: {
          OR: [
            { id: id },
            { asaasId: normalizedId },
            { asaasId: id }
          ]
        }
      });

      // 2. Check for email collision if email is being changed or user is being created
      if (data.email) {
        const emailCollision = await prisma.user.findFirst({
          where: {
            email: data.email,
            id: { not: existing?.id } // Allow own email
          }
        });

        if (emailCollision) {
          return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
        }
      }

      let user;
      if (existing) {
        user = await prisma.user.update({
          where: { id: existing.id },
          data
        });
      } else if (isAsaasId) {
        // Create local record for Asaas customer
        user = await prisma.user.create({
          data: {
            ...data,
            asaasId: normalizedId,
            tenantId: req.tenantId!,
            password: 'NO_PASSWORD_MANAGED_LOCALLY',
          }
        });
      } else {
        return res.status(404).json({ error: `Usuário não encontrado (ID: ${id}).` });
      }

      res.json({ message: 'Usuário atualizado com sucesso', user });
    } catch (error: any) {
      console.error('❌ [UserController.update error]:', error);
      res.status(500).json({ 
        error: error.message || 'Falha ao atualizar colaborador.',
        code: error.code,
        meta: error.meta
      });
    }
  }

  static async updateCustomer(req: Request, res: Response) {
    const { asaasId } = req.params;
    const { name, phone, role } = req.body;

    try {
      const email = req.body.email || `temp_${asaasId}@slx.com`;
      
      // Check if email already belongs to someone else (who is NOT this asaasId)
      const emailCollision = await prisma.user.findFirst({
        where: {
          email,
          NOT: { asaasId }
        }
      });

      if (emailCollision) {
        return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
      }

      const user = await prisma.user.upsert({
        where: { asaasId },
        update: { name, phone, role: role as any },
        create: {
          asaasId,
          name,
          phone,
          role: role as any,
          email,
          password: 'NO_PASSWORD_MANAGED_LOCALLY',
          tenantId: req.tenantId!
        }
      });

      res.json({ message: 'Alterações salvas no banco de dados', user });
    } catch (error) {
      console.error('UserController.updateCustomer error:', error);
      res.status(500).json({ error: 'Falha ao salvar alterações.' });
    }
  }

  static async getUserProperties(req: Request, res: Response) {
    const { userId } = req.params;
    const tenantId = req.tenantId;

    try {
      // Resolve internal ID if userId is an Asaas ID
      const upperId = userId.toUpperCase();
      let internalId = userId;
      if (upperId.startsWith('CUS_')) {
        const user = await prisma.user.findFirst({ 
          where: { 
            OR: [{ asaasId: upperId }, { asaasId: userId }],
            tenantId 
          } 
        });
        if (!user) return res.json([]); // No local user yet means no properties
        internalId = user.id;
      }

      const properties = await prisma.property.findMany({
        where: { landlordId: internalId, tenantId, deletedAt: null }
      });
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user properties' });
    }
  }

  static async updateUserProperties(req: Request, res: Response) {
    const { userId } = req.params;
    const { properties } = req.body;
    const tenantId = req.tenantId;

    try {
      // Resolve internal ID or create local record if it's an Asaas user
      const upperId = userId.toUpperCase();
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: userId },
            { asaasId: upperId },
            { asaasId: userId }
          ],
          tenantId
        }
      });

      if (!user && upperId.startsWith('CUS_')) {
        // Create local user record automatically from Asaas data
        try {
          const asaasCust = await asaasApi.get(`/customers/${upperId}`);
          const c = asaasCust.data;
          user = await prisma.user.create({
            data: {
              asaasId: userId,
              name: c.name,
              email: c.email || `temp_${userId}@slx.com`,
              phone: c.mobilePhone || c.phone || '',
              role: 'LANDLORD', // Default for this action
              password: 'NO_PASSWORD_MANAGED_LOCALLY',
              tenantId: tenantId!,
              isEmailVerified: true
            }
          });
        } catch (asaasErr) {
          console.error('Failed to fetch user from Asaas for auto-sync:', asaasErr);
          return res.status(404).json({ error: 'Usuário não encontrado no Asaas ou erro de sincronização.' });
        }
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const internalId = user.id;

      // 1. Get current IDs
      const currentProps = await prisma.property.findMany({
        where: { landlordId: internalId, tenantId, deletedAt: null },
        select: { id: true }
      });
      const currentIds = currentProps.map(p => p.id);
      
      // 2. Identify which ones to keep/update and which to delete
      const incomingIds = properties.map((p: any) => p.id).filter(Boolean);
      const idsToDelete = currentIds.filter(id => !incomingIds.includes(id));

      // 3. Delete removed ones
      if (idsToDelete.length > 0) {
        await prisma.property.updateMany({
          where: { id: { in: idsToDelete } },
          data: { deletedAt: new Date() }
        });
      }

      // 4. Create or Update incoming
      for (const prop of properties) {
        if (prop.id) {
          await prisma.property.update({
            where: { id: prop.id },
            data: {
              address: prop.address,
              neighborhood: prop.neighborhood,
              city: prop.city,
              state: prop.state || 'RJ'
            }
          });
        } else if (prop.address) {
          await prisma.property.create({
            data: {
              address: prop.address,
              neighborhood: prop.neighborhood,
              city: prop.city,
              state: prop.state || 'RJ',
              landlordId: internalId,
              tenantId: tenantId!
            }
          });
        }
      }

      res.json({ message: 'Propriedades atualizadas com sucesso' });
    } catch (error) {
      console.error('Update user properties error:', error);
      res.status(500).json({ error: 'Failed to update user properties' });
    }
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    try {
      await prisma.user.update({ 
        where: { id },
        data: { deletedAt: new Date() }
      });
      res.json({ message: 'Colaborador removido com sucesso' });
    } catch (error) {
      console.error('UserController.delete error:', error);
      res.status(500).json({ error: 'Falha ao remover colaborador.' });
    }
  }
}
