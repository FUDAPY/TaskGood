import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { User, UserDocument, UserRole } from '../users/schemas/user.schema';

@Injectable()
export class AuthService implements OnModuleInit {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async onModuleInit() {
    await this.seedSuperAdmin();
    await this.seedRequestedUser();
  }

  async seedRequestedUser() {
    try {
      const email = 'giuliano777gamer@gmail.com';
      const existingUser = await this.userModel.findOne({ email });
      const hashedPassword = await bcrypt.hash('741963', 10);
      if (!existingUser) {
        await this.userModel.create({
          name: 'Giuliano Catella',
          email,
          password: hashedPassword,
          role: UserRole.ADMIN,
          phone: '',
          isFirstLogin: false,
          passwordChangedManually: false,
        });
        this.logger.log(`Usuario administrador creado en DB: ${email}`);
      } else if (!existingUser.passwordChangedManually) {
        existingUser.password = hashedPassword;
        existingUser.role = UserRole.ADMIN;
        existingUser.isFirstLogin = false;
        await existingUser.save();
        this.logger.log(`Usuario administrador actualizado con credenciales en DB: ${email}`);
      }
    } catch (err) {
      this.logger.error('Error durante la inicialización del usuario solicitado', err);
    }
  }

  async seedSuperAdmin() {
    try {
      // Si ya existe CUALQUIER usuario administrador en la base de datos, no recrear nada
      const anyAdmin = await this.userModel.findOne({ role: UserRole.ADMIN });
      if (anyAdmin) {
        this.logger.log('Administrador existente detectado en DB. Omitiendo seed.');
        return;
      }
      const existingSuperAdmin = await this.userModel.findOne({ email: 'task@prueba.com' });
      if (!existingSuperAdmin) {
        const hashedPassword = await bcrypt.hash('741963', 10);
        await this.userModel.create({
          name: 'Super Administrador',
          email: 'task@prueba.com',
          password: hashedPassword,
          role: UserRole.ADMIN,
          phone: '',
          isFirstLogin: true,
        });
        this.logger.log('Seed exitoso: Superadmin creado (task@prueba.com / isFirstLogin: true)');
      }
    } catch (err) {
      this.logger.error('Error durante el seed del superadmin', err);
    }
  }

  async validateUser(email: string, pass: string): Promise<UserDocument> {
    const user = await this.userModel.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    const isMatch = await bcrypt.compare(pass, user.password);
    if (!isMatch) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }
    return user;
  }

  async login(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        isFirstLogin: user.isFirstLogin,
      },
    };
  }

  async firstLoginUpdate(userId: string, newEmail: string, newPass: string) {
    if (!newEmail || !newPass || newPass.length < 6) {
      throw new BadRequestException('El nuevo correo y una contraseña de al menos 6 caracteres son requeridos.');
    }
    const cleanEmail = newEmail.toLowerCase().trim();
    const existing = await this.userModel.findOne({
      email: cleanEmail,
      _id: { $ne: userId },
    });
    if (existing) {
      throw new ConflictException('El correo ingresado ya se encuentra registrado por otro usuario.');
    }

    const hashedPassword = await bcrypt.hash(newPass, 10);
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        email: cleanEmail,
        password: hashedPassword,
        isFirstLogin: false,
        passwordChangedManually: true,
      },
      { new: true },
    ).select('-password');

    if (!updatedUser) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const payload = { sub: updatedUser._id.toString(), email: updatedUser.email, role: updatedUser.role };
    return {
      message: 'Credenciales actualizadas exitosamente.',
      access_token: this.jwtService.sign(payload),
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        isFirstLogin: false,
      },
    };
  }
}
