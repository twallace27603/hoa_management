import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import type { RoleName } from '../auth/roles.constants';

// Gating mechanism described in the architecture: an admin invites an email
// address to an HOA with a role (PENDING membership, no User row yet). The
// invitee authenticates via Entra External ID; on first callback we link
// their entraObjectId to a User row and activate any PENDING memberships
// that match their email. No matching invite -> no access, regardless of
// how they authenticated.
@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  async invite(
    hoaId: string | null,
    invitedEmail: string,
    roleName: RoleName,
    invitedByUserId: string,
  ) {
    const role = await this.prisma.role.findUniqueOrThrow({
      where: { name: roleName },
    });

    const membership = await this.prisma.membership.create({
      data: {
        hoaId,
        invitedEmail,
        roleId: role.id,
        invitedByUserId,
        status: 'PENDING',
      },
    });

    await this.email.sendToAddresses(hoaId, invitedByUserId, [invitedEmail], {
      subject: 'You have been invited',
      body: `You've been invited to join as ${roleName}. Sign in with this email address to activate your account.`,
    });

    return membership;
  }

  // Called from the auth callback after a successful Entra External ID sign-in.
  async activatePendingMembershipsForEmail(
    entraObjectId: string,
    email: string,
  ) {
    const user = await this.prisma.user.upsert({
      where: { entraObjectId },
      update: { email },
      create: { entraObjectId, email },
    });

    const pending = await this.prisma.membership.findMany({
      where: { invitedEmail: email, status: 'PENDING' },
    });

    if (pending.length === 0) {
      throw new NotFoundException(
        'No pending invitation found for this email address',
      );
    }

    await this.prisma.membership.updateMany({
      where: { id: { in: pending.map((m) => m.id) } },
      data: { userId: user.id, status: 'ACTIVE', activatedAt: new Date() },
    });

    return user;
  }

  listForHoa(hoaId: string) {
    return this.prisma.membership.findMany({
      where: { hoaId },
      include: { user: true, role: true },
    });
  }

  revoke(membershipId: string) {
    return this.prisma.membership.update({
      where: { id: membershipId },
      data: { status: 'REVOKED' },
    });
  }
}
