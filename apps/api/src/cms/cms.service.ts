import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// bodyHtml is board-authored rich text, not user-generated at scale, but it
// is still rendered in browsers. Sanitize with an allowlist (e.g. DOMPurify)
// on the frontend before rendering, and consider sanitizing on write here
// too once a rich-text editor is chosen.
@Injectable()
export class CmsService {
  constructor(private readonly prisma: PrismaService) {}

  listPublished(hoaId: string) {
    return this.prisma.cmsPage.findMany({
      where: { hoaId, isPublished: true },
    });
  }

  listAll(hoaId: string) {
    return this.prisma.cmsPage.findMany({ where: { hoaId } });
  }

  upsert(
    hoaId: string,
    slug: string,
    title: string,
    bodyHtml: string,
    isPublished: boolean,
    updatedByUserId: string,
  ) {
    return this.prisma.cmsPage.upsert({
      where: { hoaId_slug: { hoaId, slug } },
      create: { hoaId, slug, title, bodyHtml, isPublished, updatedByUserId },
      update: { title, bodyHtml, isPublished, updatedByUserId },
    });
  }
}
