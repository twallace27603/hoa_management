import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EMAIL_SENDER, type EmailSender } from './email-sender.interface';
import type { RoleName } from '../auth/roles.constants';

interface EmailContent {
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_SENDER) private readonly sender: EmailSender,
    private readonly prisma: PrismaService,
  ) {}

  async sendToAllMembers(
    hoaId: string,
    sentByUserId: string,
    content: EmailContent,
  ) {
    const recipients = await this.resolveRecipientEmails(hoaId);
    await this.dispatch(
      hoaId,
      sentByUserId,
      'ALL_MEMBERS',
      null,
      recipients,
      content,
    );
  }

  async sendToSpecificMembers(
    hoaId: string,
    sentByUserId: string,
    memberUserIds: string[],
    content: EmailContent,
  ) {
    const users = await this.prisma.user.findMany({
      where: { id: { in: memberUserIds } },
    });
    await this.dispatch(
      hoaId,
      sentByUserId,
      'SPECIFIC_MEMBERS',
      null,
      users.map((u) => u.email),
      content,
    );
  }

  // For recipients who don't have a User row yet (e.g. a fresh invite before
  // the invitee has ever signed in).
  async sendToAddresses(
    hoaId: string | null,
    sentByUserId: string | null,
    to: string[],
    content: EmailContent,
  ) {
    if (!hoaId) {
      await this.sender.send({
        to,
        subject: content.subject,
        body: content.body,
      });
      return;
    }
    await this.dispatch(
      hoaId,
      sentByUserId,
      'SPECIFIC_MEMBERS',
      null,
      to,
      content,
    );
  }

  async sendToRole(hoaId: string, role: RoleName, content: EmailContent) {
    const recipients = await this.resolveRecipientEmails(hoaId, role);
    await this.dispatch(hoaId, null, 'ALL_MEMBERS', null, recipients, content);
  }

  private async resolveRecipientEmails(hoaId: string, role?: RoleName) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        hoaId,
        status: 'ACTIVE',
        ...(role ? { role: { name: role } } : {}),
      },
      include: { user: true },
    });
    return memberships
      .map((m) => m.user?.email)
      .filter((email): email is string => Boolean(email));
  }

  private async dispatch(
    hoaId: string,
    sentByUserId: string | null,
    scope: 'ALL_MEMBERS' | 'SPECIFIC_MEMBERS' | 'ARC_REQUEST' | 'VIOLATION',
    relatedEntityId: string | null,
    recipients: string[],
    content: EmailContent,
  ) {
    if (recipients.length === 0) return;

    await this.sender.send({
      to: recipients,
      subject: content.subject,
      body: content.body,
    });

    // Audit trail of what was sent, to whom (by scope), and by whom.
    await this.prisma.emailMessage.create({
      data: {
        hoaId,
        sentByUserId: sentByUserId ?? 'system',
        subject: content.subject,
        recipientScope: scope,
        relatedEntityId,
      },
    });
  }
}
