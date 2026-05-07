import prisma from '../config/prisma';

export class TenantRepository {
  static async findBySlug(slug: string) {
    return prisma.tenant.findUnique({
      where: { slug },
    });
  }

  static async create(data: any) {
    return prisma.tenant.create({
      data,
    });
  }

  static async findById(id: string) {
    return prisma.tenant.findUnique({
      where: { id },
    });
  }
}
