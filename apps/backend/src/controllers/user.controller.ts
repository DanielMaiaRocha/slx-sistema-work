import { Request, Response } from 'express';
import { asaasApi } from '../services/asaas.service';
import { User, Property } from '../models';
import bcrypt from 'bcryptjs';

export class UserController {
  static async create(req: Request, res: Response) {
    const { name, email, password, phone, role, cpf, properties } = req.body;
    const tenantId = req.tenantId;

    try {
      if (!email || !name) {
        return res.status(400).json({ error: 'Campos obrigatórios: nome e email.' });
      }

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'E-mail já cadastrado.' });
      }

      const hashedPassword = await bcrypt.hash(password || 'FIRST_ACCESS_PENDING', 10);

      const user: any = await User.create({
        name,
        email,
        password: hashedPassword,
        phone,
        role: role || 'LANDLORD',
        cpf,
        tenantId,
        isEmailVerified: true,
      });

      if (properties && Array.isArray(properties)) {
        for (const prop of properties) {
          if (prop.address) {
            await Property.create({
              address: prop.address,
              neighborhood: prop.neighborhood || '',
              city: prop.city || '',
              state: prop.state || 'RJ',
              landlordId: user._id,
              tenantId,
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
      const users = await User.find({
        tenantId: req.tenantId,
        $or: [{ asaasId: null }, { asaasId: { $exists: false } }],
        deletedAt: null,
      })
        .sort({ createdAt: -1 })
        .lean();
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

      const localFilter: any = { tenantId: req.tenantId, deletedAt: null };
      if (role) localFilter.role = { $regex: role.toString() };
      const localUsers: any[] = await User.find(localFilter).lean();

      const formatted = customers.map((c: any) => {
        const local = localUsers.find((u) => u.asaasId?.toUpperCase() === c.id?.toUpperCase());

        let roleRaw = local?.role || c.groupName || 'TENANT';
        const normalizedRoles = roleRaw.split(',').map((r: string) => {
          const trimmed = r.trim();
          if (trimmed === 'Proprietário') return 'LANDLORD';
          if (trimmed === 'Inquilino') return 'TENANT';
          return trimmed;
        });
        const finalRole = Array.from(new Set(normalizedRoles)).join(',');

        return {
          id: c.id,
          name: local?.name || c.name,
          email: c.email || 'N/A',
          phone: local?.phone || c.mobilePhone || c.phone || 'N/A',
          cpfCnpj: c.cpfCnpj || 'N/A',
          role: finalRole,
          status: 'Ativo',
          isLocalOverride: !!local,
        };
      });

      if (offset === 0) {
        const localOnly = localUsers
          .filter((u) => !u.asaasId)
          .map((u) => ({
            id: u._id,
            name: u.name,
            email: u.email,
            phone: u.phone || 'N/A',
            cpfCnpj: u.cpf || 'N/A',
            role: u.role,
            status: 'Ativo',
            isLocalOverride: true,
          }));

        const filteredLocal = search
          ? localOnly.filter(
              (u) =>
                u.name.toLowerCase().includes(s.toLowerCase()) ||
                u.email.toLowerCase().includes(s.toLowerCase())
            )
          : localOnly;

        formatted.unshift(...filteredLocal);
      }

      res.json({
        data: formatted,
        pagination: { total: totalCount, offset: Number(offset), limit: Number(limit) },
      });
    } catch (error) {
      console.error('UserController.listAll error:', error);
      res.status(500).json({ error: 'Falha ao buscar usuários.' });
    }
  }

  static async update(req: Request, res: Response) {
    const id = req.params.id as string;
    const { name, email, password, role, phone, permissions } = req.body;

    try {
      const data: any = {
        name: name === 'N/A' ? undefined : name,
        email: email === 'N/A' ? undefined : email,
        role,
        phone: phone === 'N/A' || !phone ? null : phone.replace(/\D/g, ''),
      };

      if (password && password !== 'NO_PASSWORD_MANAGED_LOCALLY') {
        data.password = await bcrypt.hash(password, 10);
      }

      if (permissions) {
        data.permissions = typeof permissions === 'string' ? permissions : JSON.stringify(permissions);
      }

      const normalizedId = id.toUpperCase();
      const isAsaasId = normalizedId.startsWith('CUS_');

      const existing: any = await User.findOne({
        $or: [{ _id: id }, { asaasId: normalizedId }, { asaasId: id }],
      }).lean();

      if (data.email) {
        const emailCollision: any = await User.findOne({
          email: data.email,
          _id: { $ne: existing?._id },
        }).lean();

        if (emailCollision) {
          const name1Words = emailCollision.name.toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const name2Words = (name || '').toLowerCase().split(/\s+/).filter((w: string) => w.length > 3);
          const isSamePerson = name1Words.some((w: string) => name2Words.includes(w));

          if (isSamePerson) {
            delete data.email;
          } else {
            return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
          }
        }
      }

      let user: any;
      if (existing) {
        user = await User.findByIdAndUpdate(existing._id, data, { new: true }).lean();
      } else if (isAsaasId) {
        user = await User.create({
          ...data,
          asaasId: normalizedId,
          tenantId: req.tenantId,
          password: 'NO_PASSWORD_MANAGED_LOCALLY',
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
      });
    }
  }

  static async updateCustomer(req: Request, res: Response) {
    const asaasId = req.params.asaasId as string;
    const { name, phone, role } = req.body;

    try {
      const email = req.body.email || `temp_${asaasId}@slx.com`;

      const emailCollision: any = await User.findOne({ email, asaasId: { $ne: asaasId } }).lean();
      if (emailCollision) {
        return res.status(400).json({ error: 'Este e-mail já está em uso por outro usuário.' });
      }

      const user: any = await User.findOneAndUpdate(
        { asaasId },
        {
          $set: { name, phone, role },
          $setOnInsert: {
            asaasId,
            email,
            password: 'NO_PASSWORD_MANAGED_LOCALLY',
            tenantId: req.tenantId,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      res.json({ message: 'Alterações salvas no banco de dados', user });
    } catch (error) {
      console.error('UserController.updateCustomer error:', error);
      res.status(500).json({ error: 'Falha ao salvar alterações.' });
    }
  }

  static async getUserProperties(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const tenantId = req.tenantId;

    try {
      const upperId = userId.toUpperCase();
      let internalId = userId;
      if (upperId.startsWith('CUS_')) {
        const user: any = await User.findOne({
          $or: [{ asaasId: upperId }, { asaasId: userId }],
          tenantId,
        }).lean();
        if (!user) return res.json([]);
        internalId = user._id;
      }

      const properties = await Property.find({ landlordId: internalId, tenantId, deletedAt: null }).lean();
      res.json(properties);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch user properties' });
    }
  }

  static async updateUserProperties(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const { properties } = req.body;
    const tenantId = req.tenantId;

    try {
      const upperId = userId.toUpperCase();
      let user: any = await User.findOne({
        $or: [{ _id: userId }, { asaasId: upperId }, { asaasId: userId }],
        tenantId,
      }).lean();

      if (!user && upperId.startsWith('CUS_')) {
        try {
          const asaasCust = await asaasApi.get(`/customers/${upperId}`);
          const c = asaasCust.data;
          user = await User.create({
            asaasId: userId,
            name: c.name,
            email: c.email || `temp_${userId}@slx.com`,
            phone: c.mobilePhone || c.phone || '',
            role: 'LANDLORD',
            password: 'NO_PASSWORD_MANAGED_LOCALLY',
            tenantId,
            isEmailVerified: true,
          });
        } catch (asaasErr) {
          console.error('Failed to fetch user from Asaas for auto-sync:', asaasErr);
          return res.status(404).json({ error: 'Usuário não encontrado no Asaas ou erro de sincronização.' });
        }
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const internalId = user._id;

      const currentProps: any[] = await Property.find({ landlordId: internalId, tenantId, deletedAt: null })
        .select({ _id: 1 })
        .lean();
      const currentIds = currentProps.map((p) => p._id);

      const incomingIds = properties.map((p: any) => p.id).filter(Boolean);
      const idsToDelete = currentIds.filter((id: any) => !incomingIds.includes(id));

      if (idsToDelete.length > 0) {
        await Property.updateMany({ _id: { $in: idsToDelete } }, { $set: { deletedAt: new Date() } });
      }

      for (const prop of properties) {
        if (prop.id) {
          await Property.findByIdAndUpdate(prop.id, {
            address: prop.address,
            neighborhood: prop.neighborhood,
            city: prop.city,
            state: prop.state || 'RJ',
          });
        } else if (prop.address) {
          await Property.create({
            address: prop.address,
            neighborhood: prop.neighborhood,
            city: prop.city,
            state: prop.state || 'RJ',
            landlordId: internalId,
            tenantId,
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
    const id = req.params.id as string;
    try {
      await User.findByIdAndUpdate(id, { deletedAt: new Date() });
      res.json({ message: 'Colaborador removido com sucesso' });
    } catch (error) {
      console.error('UserController.delete error:', error);
      res.status(500).json({ error: 'Falha ao remover colaborador.' });
    }
  }

  static async getProfile(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    try {
      const user: any = await User.findById(userId).lean();
      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }
      const { password, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error('UserController.getProfile error:', error);
      res.status(500).json({ error: 'Falha ao buscar perfil.', details: error.message });
    }
  }

  static async updateProfile(req: Request, res: Response) {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const { name, phone, cpf, creci, photoUrl } = req.body;

    try {
      if (cpf) {
        const cleanCpf = cpf.replace(/\D/g, '');
        const collision: any = await User.findOne({ cpf: cleanCpf, _id: { $ne: userId } }).lean();
        if (collision) {
          return res.status(400).json({ error: 'Este CPF já está cadastrado para outro usuário.' });
        }
      }

      const updatedUser: any = await User.findByIdAndUpdate(
        userId,
        {
          name,
          phone: phone ? phone.replace(/\D/g, '') : null,
          cpf: cpf ? cpf.replace(/\D/g, '') : null,
          creci: creci || null,
          photoUrl: photoUrl || null,
        },
        { new: true }
      ).lean();

      const { password, ...safeUser } = updatedUser;

      res.json({ message: 'Perfil atualizado com sucesso.', user: safeUser });
    } catch (error: any) {
      console.error('UserController.updateProfile error:', error);
      res.status(500).json({ error: 'Falha ao atualizar perfil do usuário.', details: error.message });
    }
  }
}
