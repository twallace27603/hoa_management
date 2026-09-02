import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { ViolationEventType } from '../../generated/prisma/client';

const PHOTOS_CONTAINER = 'violation-photos';

// History entries are never updated or deleted, by design and by DB grant
// (the app's Postgres role has UPDATE/DELETE revoked on
// ViolationHistoryEntry/ViolationPhoto — see infra/sql/harden.sql). Every
// state change is a new row.
@Injectable()
export class ViolationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  list(hoaId: string) {
    return this.prisma.violation.findMany({
      where: { hoaId },
      include: {
        historyEntries: { orderBy: { recordedAt: 'asc' } },
        photos: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async report(
    hoaId: string,
    reportedByUserId: string,
    propertyAddress: string,
    description: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const violation = await tx.violation.create({
        data: { hoaId, reportedByUserId, propertyAddress },
      });
      await tx.violationHistoryEntry.create({
        data: {
          violationId: violation.id,
          eventType: 'REPORTED',
          description,
          recordedByUserId: reportedByUserId,
        },
      });
      return violation;
    });
  }

  addHistoryEntry(
    violationId: string,
    eventType: ViolationEventType,
    description: string,
    recordedByUserId: string,
  ) {
    return this.prisma.violationHistoryEntry.create({
      data: { violationId, eventType, description, recordedByUserId },
    });
  }

  async requestPhotoUploadUrl(hoaId: string, violationId: string) {
    const blobPath = `hoas/${hoaId}/violations/${violationId}/${crypto.randomUUID()}`;
    const uploadUrl = await this.storage.generateUploadUrl(
      PHOTOS_CONTAINER,
      blobPath,
    );
    return { blobPath, uploadUrl };
  }

  recordPhoto(violationId: string, blobPath: string, uploadedByUserId: string) {
    return this.prisma.violationPhoto.create({
      data: { violationId, blobPath, uploadedByUserId },
    });
  }
}
