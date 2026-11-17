import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class FirstLoginGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (user && user.isFirstLogin) {
      const allowedPaths = [
        '/api/auth/first-login-update',
        '/api/auth/me',
        '/api/auth/logout'
      ];
      const isAllowed = allowedPaths.some(p => request.url.startsWith(p));
      if (!isAllowed) {
        throw new ForbiddenException({
          statusCode: 403,
          code: 'FIRST_LOGIN_REQUIRED',
          message: 'Actualización de credenciales requerida. Debe cambiar su correo y contraseña antes de continuar.',
        });
      }
    }

    return true;
  }
}
