import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, Tenant, Role } from '../models';
import { AsaasService } from '../services/asaas.service';
import { EmailService } from '../services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export class TenantAuthController {
  static async login(req: Request, res: Response) {
    const { cpf, password, intendedRole } = req.body;

    if (!cpf || !password) {
      return res.status(400).json({ error: 'CPF e senha são obrigatórios' });
    }

    try {
      const cleanCpf = cpf.replace(/\D/g, '');
      const tenantId = req.tenantId;

      const user: any = await User.findOne({ cpf: cleanCpf, tenantId }).lean();
      if (!user) {
        return res.status(401).json({ error: 'Usuário não encontrado' });
      }

      const tenant: any = await Tenant.findById(user.tenantId).lean();

      const allRoles = (user.role || '').split(',').map((r: string) => r.trim());

      if (intendedRole) {
        if (!allRoles.includes(intendedRole) && !allRoles.includes('ADMIN') && !allRoles.includes('OWNER')) {
          const roleLabel = intendedRole === 'TENANT' ? 'Inquilino' : 'Proprietário';
          return res.status(403).json({ error: `Você não possui acesso ao portal de ${roleLabel}.` });
        }
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }

      let sessionRole = user.role;
      if (intendedRole && (allRoles.includes(intendedRole) || allRoles.includes('ADMIN'))) {
        sessionRole = allRoles.includes('ADMIN') ? user.role : intendedRole;
      }

      const token = jwt.sign(
        {
          id: user._id,
          email: user.email,
          role: sessionRole,
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
          id: user._id,
          name: user.name,
          role: sessionRole,
          asaasId: user.asaasId,
          tenant: {
            name: tenant?.name,
            logoUrl: tenant?.logoUrl
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

      let user: any = await User.findOne({ cpf: cleanCpf }).lean();

      if (!user) {
        const asaasCustomer = await AsaasService.findCustomerByCpf(cleanCpf);
        if (!asaasCustomer) {
          return res.status(404).json({ error: 'CPF não encontrado na base de clientes' });
        }

        const firstTenant: any = await Tenant.findOne().lean();
        if (!firstTenant) return res.status(500).json({ error: 'Sistema não configurado' });

        const created: any = await User.create({
          email,
          cpf: cleanCpf,
          name: asaasCustomer.name,
          phone: asaasCustomer.mobilePhone || asaasCustomer.phone,
          password: await bcrypt.hash(Math.random().toString(36), 10),
          role: Role.TENANT,
          asaasId: asaasCustomer.id,
          tenantId: firstTenant._id
        });
        user = created.toObject ? created.toObject() : created;
      } else {
        const updated: any = await User.findByIdAndUpdate(user._id, { email }, { new: true }).lean();
        user = updated;
      }

      const token = jwt.sign({ id: user._id, type: 'first_access' }, JWT_SECRET, { expiresIn: '1h' });

      const isLandlord = user.role === 'LANDLORD' || user.role === 'OWNER';
      const areaPath = isLandlord ? 'proprietario' : 'inquilinos';
      const magicLink = `${FRONTEND_URL}/login/${areaPath}/primeiro-acesso/definir-senha?token=${token}`;

      await EmailService.sendMagicLink(email, user.name, magicLink);

      res.json({
        message: 'Link de acesso enviado com sucesso para seu e-mail!',
        magicLink: process.env.NODE_ENV === 'development' ? magicLink : undefined
      });
    } catch (error: any) {
      console.error('❌ [First Access Error]:', error);

      // Mongo duplicate key error
      if (error?.code === 11000) {
        const field = Object.keys(error.keyPattern || {})[0] || 'e-mail';
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
      await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

      res.json({ message: 'Senha definida com sucesso! Agora você já pode fazer login.' });
    } catch (error: any) {
      console.error('Set password error:', error);
      res.status(400).json({ error: 'Token expirado ou inválido' });
    }
  }
}
