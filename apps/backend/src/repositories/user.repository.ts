import prisma from '../config/prisma';
import { User, Role } from '@prisma/client';

export class UserRepository {
  static async findByEmail(email: string) {
    return prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
  }

  static async create(data: any) {
    return prisma.user.create({
      data,
    });
  }

  static async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
  }

  static async update(id: string, data: any) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }
}
