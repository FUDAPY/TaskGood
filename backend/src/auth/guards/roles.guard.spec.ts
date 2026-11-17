import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/schemas/user.schema';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  const mockContext = (requiredRoles: UserRole[] | null, user: any) => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);
    return {
      getHandler: () => {},
      getClass: () => {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  it('permite acceso si la ruta no exige ningún rol', () => {
    const ctx = mockContext(null, { role: UserRole.FUNCIONARIO });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('permite acceso si el usuario tiene el rol requerido', () => {
    const ctx = mockContext([UserRole.ADMIN], { role: UserRole.ADMIN });
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('bloquea acceso si el usuario no tiene el rol requerido', () => {
    const ctx = mockContext([UserRole.ADMIN], { role: UserRole.FUNCIONARIO });
    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });
});
