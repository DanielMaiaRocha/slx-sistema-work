import { User } from '../models';

export class UserRepository {
  static async findByEmail(email: string) {
    return User.findOne({ email, deletedAt: null }).lean();
  }

  static async create(data: any) {
    return User.create(data);
  }

  static async findById(id: string) {
    return User.findOne({ _id: id, deletedAt: null }).lean();
  }

  static async update(id: string, data: any) {
    return User.findByIdAndUpdate(id, data, { new: true }).lean();
  }
}
