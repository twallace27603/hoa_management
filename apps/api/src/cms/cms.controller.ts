import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { CmsService } from './cms.service';

@Controller('hoas/:hoaId/pages')
export class CmsController {
  constructor(private readonly cms: CmsService) {}

  // Public: no auth guard. Powers the public-facing HOA site.
  @Get()
  listPublished(@Param('hoaId') hoaId: string) {
    return this.cms.listPublished(hoaId);
  }

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  listAll(@Param('hoaId') hoaId: string) {
    return this.cms.listAll(hoaId);
  }

  @Put(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  upsert(
    @Param('hoaId') hoaId: string,
    @Param('slug') slug: string,
    @Body('title') title: string,
    @Body('bodyHtml') bodyHtml: string,
    @Body('isPublished') isPublished: boolean,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.cms.upsert(
      hoaId,
      slug,
      title,
      bodyHtml,
      isPublished,
      user.userId!,
    );
  }
}
