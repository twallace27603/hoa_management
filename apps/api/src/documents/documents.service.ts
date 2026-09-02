import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from '../auth/types';
import { ROLES } from '../auth/roles.constants';

// TODO: replace visibility filtering with Postgres RLS once policies land
// (infra/modules/postgres); this in-app filter is the interim enforcement.
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService) {}

  listFolders(hoaId: string) {
    return this.prisma.documentFolder.findMany({ where: { hoaId } });
  }

  createFolder(hoaId: string, name: string, parentId: string | null) {
    return this.prisma.documentFolder.create({
      data: { hoaId, name, parentId },
    });
  }

  listDocuments(hoaId: string, folderId: string, requester: AuthenticatedUser) {
    const isBoard = requester.memberships.some(
      (m) =>
        m.hoaId === hoaId &&
        [ROLES.HOA_BOARD, ROLES.HOA_PRESIDENT, ROLES.GLOBAL_ADMIN].includes(
          m.role as never,
        ),
    );

    return this.prisma.document.findMany({
      where: {
        hoaId,
        folderId,
        ...(isBoard ? {} : { visibility: 'MEMBER' }),
      },
    });
  }

  // TODO: accept an uploaded file, push it to Azure Blob Storage under
  // `hoas/{hoaId}/documents/...`, and store the resulting blobPath.
  createDocument(
    hoaId: string,
    folderId: string,
    title: string,
    blobPath: string,
    uploadedByUserId: string,
  ) {
    return this.prisma.document.create({
      data: { hoaId, folderId, title, blobPath, uploadedByUserId },
    });
  }
}
