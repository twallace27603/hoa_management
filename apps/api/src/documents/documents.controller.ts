import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ROLES } from '../auth/roles.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types';
import { DocumentsService } from './documents.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('hoas/:hoaId/documents')
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get('folders')
  @Roles(ROLES.MEMBER, ROLES.ARC_CHAIR, ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  listFolders(@Param('hoaId') hoaId: string) {
    return this.documents.listFolders(hoaId);
  }

  @Post('folders')
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  createFolder(
    @Param('hoaId') hoaId: string,
    @Body('name') name: string,
    @Body('parentId') parentId?: string,
  ) {
    return this.documents.createFolder(hoaId, name, parentId ?? null);
  }

  @Get('folders/:folderId')
  @Roles(ROLES.MEMBER, ROLES.ARC_CHAIR, ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  listDocuments(
    @Param('hoaId') hoaId: string,
    @Param('folderId') folderId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.listDocuments(hoaId, folderId, user);
  }

  @Post('folders/:folderId')
  @Roles(ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT)
  createDocument(
    @Param('hoaId') hoaId: string,
    @Param('folderId') folderId: string,
    @Body('title') title: string,
    @Body('blobPath') blobPath: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.documents.createDocument(
      hoaId,
      folderId,
      title,
      blobPath,
      user.userId!,
    );
  }
}
