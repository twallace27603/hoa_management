import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ROLES, type RoleName } from '../auth/roles.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { MembershipsService } from './memberships.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hoas/:hoaId/memberships')
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  @Roles(ROLES.HOA_PRESIDENT, ROLES.HOA_BOARD)
  list(@Param('hoaId') hoaId: string) {
    return this.memberships.listForHoa(hoaId);
  }

  @Post('invite')
  @Roles(ROLES.HOA_PRESIDENT)
  invite(
    @Param('hoaId') hoaId: string,
    @Body('email') email: string,
    @Body('role') role: RoleName,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.memberships.invite(hoaId, email, role, user.userId!);
  }
}
