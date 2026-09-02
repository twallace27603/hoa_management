import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ArcRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  list(hoaId: string) {
    return this.prisma.arcRequest.findMany({
      where: { hoaId },
      include: { attachments: true, reviews: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async submit(
    hoaId: string,
    submittedByUserId: string,
    title: string,
    description: string,
  ) {
    const request = await this.prisma.arcRequest.create({
      data: { hoaId, submittedByUserId, title, description },
    });

    // TODO: notify ARC chair(s) for this HOA once membership lookup is wired up.
    await this.email.sendToRole(hoaId, 'ARC_CHAIR', {
      subject: `New ARC request: ${title}`,
      body: `A new architecture request was submitted: ${description}`,
    });

    return request;
  }

  // TODO: accept a file upload and push it to Azure Blob Storage under
  // `hoas/{hoaId}/arc-requests/{arcRequestId}/...`.
  addAttachment(
    arcRequestId: string,
    fileName: string,
    blobPath: string,
    uploadedByUserId: string,
  ) {
    return this.prisma.arcRequestAttachment.create({
      data: { arcRequestId, fileName, blobPath, uploadedByUserId },
    });
  }

  async review(
    arcRequestId: string,
    reviewedByUserId: string,
    decision: 'APPROVED' | 'REJECTED',
    comments: string | undefined,
  ) {
    const [review] = await this.prisma.$transaction([
      this.prisma.arcRequestReview.create({
        data: { arcRequestId, reviewedByUserId, decision, comments },
      }),
      this.prisma.arcRequest.update({
        where: { id: arcRequestId },
        data: { status: decision },
      }),
    ]);

    // TODO: notify the original submitter of the decision.
    return review;
  }
}
