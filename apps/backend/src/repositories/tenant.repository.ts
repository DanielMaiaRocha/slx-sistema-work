import { Tenant } from '../models';

export class TenantRepository {
  static async findBySlug(slug: string) {
    return Tenant.findOne({ slug }).lean();
  }

  static async create(data: any) {
    return Tenant.create(data);
  }

  static async findById(id: string) {
    return Tenant.findById(id).lean();
  }
}
