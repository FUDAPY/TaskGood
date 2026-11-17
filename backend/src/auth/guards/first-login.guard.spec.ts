import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirstLoginGuard } from './first-login.guard';

describe('FirstLoginGuard', () => {
  let guard: FirstLoginGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new FirstLoginGuard(reflector);
  });

  const mockContext = (url: string, user: any, isPublic = false) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(isPublic);
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({
          url,
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  };

  it('permite acceso si la ruta es pública', () => {
    const ctx = mockContext('/api/auth/login', null, true);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acceso si el usuario no tiene la bandera isFirstLogin activa', () => {
    const ctx = mockContext('/api/tasks/today', { isFirstLogin: false });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bloquea el acceso a rutas protegidas normales si isFirstLogin es true', () => {
    const ctx = mockContext('/api/tasks/today', { isFirstLogin: true });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('permite acceso a /api/auth/first-login-update incluso si isFirstLogin es true', () => {
    const ctx = mockContext('/api/auth/first-login-update', { isFirstLogin: true });
    expect(guard.canActivate(ctx)).toBe(true);
  });
});
