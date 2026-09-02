import { Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import type { AuthenticatedUser } from './types';
import { MembershipsService } from '../memberships/memberships.service';

// Called once by the frontend right after a successful Entra External ID
// sign-in. Only requires a valid token (no role check yet, since the caller
// may not have any activated membership at this point) — it links the
// token's identity to any matching PENDING invitation.
@Controller('auth')
export class AuthController {
  constructor(private readonly memberships: MembershipsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('session')
  async bootstrapSession(@CurrentUser() user: AuthenticatedUser) {
    if (!user.userId) {
      await this.memberships.activatePendingMembershipsForEmail(
        user.entraObjectId,
        user.email,
      );
    }
    return { ok: true };
  }
}
