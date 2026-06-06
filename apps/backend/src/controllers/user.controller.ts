import { Request, Response } from 'express';
import { asaasApi, AsaasService } from '../services/asaas.service';
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
      // Translate the search term into the right Asaas customer filter.
      let s = '';
      const searchParams: any = {};
      if (search) {
        s = search.toString();
        if (s.includes('@')) searchParams.email = s;
        else if (/^\d+$/.test(s.replace(/[-. /]/g, ''))) searchParams.cpfCnpj = s.replace(/[-. /]/g, '');
        else searchParams.name = s;
      }

      // Normalize a (possibly CSV, possibly Portuguese) role string into a
      // deduped list of canonical English roles.
      const normalizeRole = (raw: string): string[] =>
        Array.from(
          new Set(
            (raw || '')
              .split(',')
              .map((r) => {
                const t = r.trim();
                if (t === 'Proprietário') return 'LANDLORD';
                if (t === 'Inquilino') return 'TENANT';
                return t;
              })
              .filter(Boolean)
          )
        );

      // All local users for this tenant: provides role overrides for Asaas
      // customers AND the manually-created (local-only) users.
      const localUsers: any[] = await User.find({ tenantId: req.tenantId, deletedAt: null }).lean();
      const overrideByAsaas = new Map<string, any>();
      localUsers.forEach((u) => {
        if (u.asaasId) overrideByAsaas.set(u.asaasId.toUpperCase(), u);
      });

      // The effective role is the local override (CSV, may hold multiple roles
      // like "LANDLORD,TENANT") when present, else the Asaas group. This is the
      // single source of truth we filter cargo on — never the Asaas groupName,
      // which is a single Portuguese group and ignores local multi-role edits.
      const mapCustomer = (c: any) => {
        const local = overrideByAsaas.get(c.id?.toUpperCase());
        return {
          id: c.id,
          name: local?.name || c.name,
          email: c.email || 'N/A',
          phone: local?.phone || c.mobilePhone || c.phone || 'N/A',
          cpfCnpj: c.cpfCnpj || 'N/A',
          role: normalizeRole(local?.role || c.groupName || 'TENANT').join(','),
          status: 'Ativo',
          isLocalOverride: !!local,
        };
      };

      const mapLocalOnly = (u: any) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || 'N/A',
        cpfCnpj: u.cpf || 'N/A',
        role: normalizeRole(u.role).join(','),
        status: 'Ativo',
        isLocalOverride: true,
      });

      const matchesSearch = (u: any) =>
        !search ||
        u.name.toLowerCase().includes(s.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(s.toLowerCase());

      if (role) {
        // ── Cargo filter ──
        // Filtering happens on the *resolved* role, so we can't lean on Asaas
        // pagination (it doesn't know local roles). Pull every customer (capped),
        // resolve + filter + paginate in memory. A user with multiple roles now
        // shows up under each of their cargos.
        const wanted = role.toString();

        const PAGE = 100;
        const MAX = 3000;
        const allCustomers: any[] = [];
        for (let off = 0; off < MAX; off += PAGE) {
          const r = await asaasApi.get('/customers', { params: { ...searchParams, offset: off, limit: PAGE } });
          const batch = r.data.data || [];
          allCustomers.push(...batch);
          if (batch.length < PAGE) break;
        }

        const fromAsaas = allCustomers.map(mapCustomer).filter((u) => u.role.split(',').includes(wanted));

        const localOnly = localUsers
          .filter((u) => !u.asaasId)
          .map(mapLocalOnly)
          .filter((u) => u.role.split(',').includes(wanted) && matchesSearch(u));

        // Local-only users first (manually created), then Asaas customers.
        const merged = [...localOnly, ...fromAsaas];
        const total = merged.length;
        const off = Number(offset);
        const pageData = merged.slice(off, off + Number(limit));

        return res.json({
          data: pageData,
          pagination: { total, offset: off, limit: Number(limit) },
        });
      }

      // ── No cargo filter: keep the efficient Asaas-paginated path ──
      const asaasResponse = await asaasApi.get('/customers', { params: { ...searchParams, offset, limit } });
      const customers = asaasResponse.data.data || [];
      const totalCount = asaasResponse.data.totalCount;

      const formatted = customers.map(mapCustomer);

      // Local-only users are prepended on the first page. `offset` arrives as a
      // query string ('0'), so compare numerically — otherwise `'0' === 0` is
      // false and these users (e.g. a proprietário cadastrado manualmente)
      // silently vanish from the list.
      if (Number(offset) === 0) {
        const localOnly = localUsers
          .filter((u) => !u.asaasId)
          .map(mapLocalOnly)
          .filter(matchesSearch);

        formatted.unshift(...localOnly);
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

  // Detailed registration for the "click a user → modal" view. Merges the
  // local User record with the Asaas customer (which carries address fields the
  // local record doesn't store). Accepts an internal cuid OR an Asaas `cus_` id.
  static async getDetails(req: Request, res: Response) {
    const userId = req.params.userId as string;
    const tenantId = req.tenantId;

    try {
      const upper = userId.toUpperCase();
      let local: any = null;
      let asaasId: string | null = null;

      if (upper.startsWith('CUS_')) {
        asaasId = userId;
        local = await User.findOne({
          $or: [{ asaasId: userId }, { asaasId: upper }],
          tenantId,
          deletedAt: null,
        }).lean();
      } else {
        local = await User.findOne({ _id: userId, tenantId, deletedAt: null }).lean();
        asaasId = local?.asaasId || null;
      }

      let asaasCustomer: any = null;
      if (asaasId) {
        try {
          asaasCustomer = await AsaasService.getCustomerById(asaasId);
        } catch {
          /* customer may not exist in Asaas; fall back to local data */
        }
      }

      if (!local && !asaasCustomer) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      const details = {
        id: userId,
        asaasId,
        name: local?.name || asaasCustomer?.name || 'N/A',
        email: local?.email || asaasCustomer?.email || 'N/A',
        phone: local?.phone || asaasCustomer?.mobilePhone || asaasCustomer?.phone || 'N/A',
        cpfCnpj: local?.cpf || asaasCustomer?.cpfCnpj || 'N/A',
        role: local?.role || 'TENANT',
        creci: local?.creci || null,
        createdAt: local?.createdAt || null,
        isLocalOverride: !!local,
        address: asaasCustomer
          ? {
              street: asaasCustomer.address || '',
              number: asaasCustomer.addressNumber || '',
              complement: asaasCustomer.complement || '',
              neighborhood: asaasCustomer.province || '',
              city: asaasCustomer.cityName || '',
              state: asaasCustomer.state || '',
              postalCode: asaasCustomer.postalCode || '',
            }
          : null,
      };

      res.json(details);
    } catch (error: any) {
      console.error('UserController.getDetails error:', error);
      res.status(500).json({ error: 'Falha ao buscar detalhes do usuário.' });
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
