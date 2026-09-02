import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { ViolationsService } from './violations.service';
import type { ViolationEventType } from '../../generated/prisma/client';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hoas/:hoaId/violations')
export class ViolationsController {
  constructor(private readonly violations: ViolationsService) {}

  @Get()
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  list(@Param('hoaId') hoaId: string) {
    return this.violations.list(hoaId);
  }

  @Post()
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  report(
    @Param('hoaId') hoaId: string,
    @Body('propertyAddress') propertyAddress: string,
    @Body('description') description: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.violations.report(
      hoaId,
      user.userId!,
      propertyAddress,
      description,
    );
  }

  @Post(':violationId/history')
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  addHistoryEntry(
    @Param('violationId') violationId: string,
    @Body('eventType') eventType: ViolationEventType,
    @Body('description') description: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.violations.addHistoryEntry(
      violationId,
      eventType,
      description,
      user.userId!,
    );
  }

  @Post(':violationId/photos/upload-url')
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  requestPhotoUploadUrl(
    @Param('hoaId') hoaId: string,
    @Param('violationId') violationId: string,
  ) {
    return this.violations.requestPhotoUploadUrl(hoaId, violationId);
  }

  @Post(':violationId/photos')
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  recordPhoto(
    @Param('violationId') violationId: string,
    @Body('blobPath') blobPath: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.violations.recordPhoto(violationId, blobPath, user.userId!);
  }
}
