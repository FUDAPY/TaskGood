import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UserRole } from './schemas/user.schema';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  async getAllUsers() {
    return this.usersService.findAll();
  }

  @Get('funcionarios')
  @Roles(UserRole.ADMIN)
  async getFuncionarios() {
    return this.usersService.findFuncionarios();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  async createUser(
    @Body()
    body: {
      name: string;
      email: string;
      password?: string;
      role: UserRole;
      phone?: string;
    },
  ) {
    return this.usersService.create(body);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      password?: string;
      role?: UserRole;
      phone?: string;
    },
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async deleteUser(@Param('id') id: string) {
    return this.usersService.delete(id);
  }

  @Post('push-subscription')
  async savePushSubscription(@Request() req: any, @Body() body: any) {
    await this.usersService.savePushSubscription(req.user._id, body);
    return { success: true, message: 'Suscripción Push guardada correctamente.' };
  }
}
