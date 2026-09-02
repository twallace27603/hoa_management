import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { ArcRequestsService } from './arc-requests.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hoas/:hoaId/arc-requests')
export class ArcRequestsController {
  constructor(private readonly arcRequests: ArcRequestsService) {}

  @Get()
  @Roles(ROLES.MEMBER, ROLES.ARC_CHAIR, ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  list(@Param('hoaId') hoaId: string) {
    return this.arcRequests.list(hoaId);
  }

  @Post()
  @Roles(ROLES.MEMBER)
  submit(
    @Param('hoaId') hoaId: string,
    @Body('title') title: string,
    @Body('description') description: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.arcRequests.submit(hoaId, user.userId!, title, description);
  }

  @Post(':arcRequestId/attachments')
  @Roles(ROLES.MEMBER, ROLES.ARC_CHAIR, ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  addAttachment(
    @Param('arcRequestId') arcRequestId: string,
    @Body('fileName') fileName: string,
    @Body('blobPath') blobPath: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.arcRequests.addAttachment(
      arcRequestId,
      fileName,
      blobPath,
      user.userId!,
    );
  }

  @Post(':arcRequestId/reviews')
  @Roles(ROLES.ARC_CHAIR, ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  review(
    @Param('arcRequestId') arcRequestId: string,
    @Body('decision') decision: 'APPROVED' | 'REJECTED',
    @Body('comments') comments: string | undefined,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.arcRequests.review(
      arcRequestId,
      user.userId!,
      decision,
      comments,
    );
  }
}
