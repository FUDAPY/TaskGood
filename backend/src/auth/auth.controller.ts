import { Body, Controller, Get, Post, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  async login(@Body() body: { email?: string; password?: string }) {
    const user = await this.authService.validateUser(body.email || '', body.password || '');
    return this.authService.login(user);
  }

  @Get('me')
  async getProfile(@Request() req: any) {
    return req.user;
  }

  @Post('first-login-update')
  async firstLoginUpdate(
    @Request() req: any,
    @Body() body: { email: string; password: string },
  ) {
    return this.authService.firstLoginUpdate(req.user._id, body.email, body.password);
  }
}
