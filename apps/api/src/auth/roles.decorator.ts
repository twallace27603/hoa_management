import { SetMetadata } from '@nestjs/common';
import type { RoleName } from './roles.constants';

export const ROLES_KEY = 'roles';

// Marks a route as requiring one of the given roles *within the request's
// HOA scope* (the :hoaId route param), unless the caller holds a global
// role (e.g. GLOBAL_ADMIN). See RolesGuard.
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);
