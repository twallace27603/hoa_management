import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from './roles.decorator';
import { ROLES, type RoleName } from './roles.constants';
import type { AuthenticatedUser } from './types';

// Must run after JwtAuthGuard. Checks that request.user holds one of the
// route's required roles for the HOA identified by the :hoaId route param —
// or holds a global role (hoaId === null), which bypasses tenant scoping.
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      RoleName[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<
        Request & { user?: AuthenticatedUser; params: Record<string, string> }
      >();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('No authenticated user on request');
    }

    const requestHoaId = request.params.hoaId;

    const hasRole = user.memberships.some((m) => {
      if (m.role === ROLES.GLOBAL_ADMIN) return true;
      if (!requiredRoles.includes(m.role as RoleName)) return false;
      return m.hoaId === requestHoaId;
    });

    if (!hasRole) {
      throw new ForbiddenException('Insufficient role for this HOA');
    }
    return true;
  }
}
