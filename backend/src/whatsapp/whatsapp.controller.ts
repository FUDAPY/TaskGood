import { Body, Controller, Get, Post } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/schemas/user.schema';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @Roles(UserRole.ADMIN)
  getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('pair')
  @Roles(UserRole.ADMIN)
  async requestPairing(@Body() body: { phoneNumber: string }) {
    return this.whatsappService.requestPairing(body.phoneNumber);
  }

  @Post('disconnect')
  @Roles(UserRole.ADMIN)
  async disconnect() {
    await this.whatsappService.destroyClient();
    return { success: true, message: 'Sesión de WhatsApp desconectada.' };
  }
}
