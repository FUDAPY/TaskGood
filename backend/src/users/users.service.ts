import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from './schemas/user.schema';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-password').sort({ name: 1 }).exec();
  }

  async findFuncionarios(): Promise<User[]> {
    return this.userModel
      .find()
      .select('-password')
      .sort({ name: 1 })
      .exec();
  }

  async findAssignableUsers(): Promise<User[]> {
    return this.userModel
      .find()
      .select('-password')
      .sort({ name: 1 })
      .exec();
  }

  async findById(id: string): Promise<User> {
    const user = await this.userModel.findById(id).select('-password').exec();
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return user;
  }

  async create(userData: {
    name: string;
    email: string;
    password?: string;
    role: UserRole;
    phone?: string;
  }): Promise<User> {
    const cleanEmail = userData.email.toLowerCase().trim();
    const existing = await this.userModel.findOne({ email: cleanEmail });
    if (existing) {
      throw new ConflictException('El correo ya se encuentra registrado.');
    }

    const rawPassword = userData.password || '123456';
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = new this.userModel({
      name: userData.name.trim(),
      email: cleanEmail,
      password: hashedPassword,
      role: userData.role || UserRole.FUNCIONARIO,
      phone: (userData.phone || '').trim(),
      isFirstLogin: false,
    });

    const saved = await newUser.save();
    return this.findById(saved._id.toString());
  }

  async update(
    id: string,
    userData: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      phone?: string;
    },
  ): Promise<User> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (userData.email) {
      const cleanEmail = userData.email.toLowerCase().trim();
      const existing = await this.userModel.findOne({
        email: cleanEmail,
        _id: { $ne: id },
      });
      if (existing) {
        throw new ConflictException('El correo ya está en uso por otro usuario.');
      }
      user.email = cleanEmail;
    }

    if (userData.name) user.name = userData.name.trim();
    if (userData.role) user.role = userData.role;
    if (userData.phone !== undefined) user.phone = userData.phone.trim();

    if (userData.password && userData.password.trim().length >= 6) {
      user.password = await bcrypt.hash(userData.password.trim(), 10);
    }

    await user.save();
    return this.findById(id);
  }

  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userModel.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.email === 'task@prueba.com') {
      throw new BadRequestException('No se puede eliminar al superadministrador inicial.');
    }
    await this.userModel.findByIdAndDelete(id);
    return { success: true, message: 'Usuario eliminado exitosamente' };
  }

  async savePushSubscription(userId: string, subscription: any): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, { pushSubscription: subscription });
  }
}
