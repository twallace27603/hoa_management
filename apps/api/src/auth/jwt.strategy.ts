import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthenticatedUser } from './types';

interface EntraJwtPayload {
  oid: string;
  sub: string;
  emails?: string[];
  email?: string;
  iss: string;
  aud: string;
}

// Validates access tokens issued by Microsoft Entra External ID (CIAM):
// signature via the tenant's JWKS endpoint, issuer, and audience. Once the
// token is verified, we resolve the caller's app-level identity (User +
// Memberships) from our own DB rather than trusting any role claim in the
// token — see docs/auth.md for why authorization is app-owned.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: config.getOrThrow<string>('ENTRA_JWKS_URI'),
      }),
      issuer: config.getOrThrow<string>('ENTRA_ISSUER'),
      audience: config.getOrThrow<string>('ENTRA_CLIENT_ID'),
      algorithms: ['RS256'],
    });
  }

  async validate(payload: EntraJwtPayload): Promise<AuthenticatedUser> {
    const email = payload.email ?? payload.emails?.[0];
    if (!email) {
      throw new UnauthorizedException('Token did not contain an email claim');
    }

    const user = await this.prisma.user.findUnique({
      where: { entraObjectId: payload.oid },
      include: {
        memberships: { where: { status: 'ACTIVE' }, include: { role: true } },
      },
    });

    if (!user) {
      // Authenticated with the IdP, but no linked/activated app identity yet.
      // Downstream guards decide whether the route requires an activated membership.
      return {
        entraObjectId: payload.oid,
        email,
        userId: null,
        memberships: [],
      };
    }

    return {
      entraObjectId: payload.oid,
      email: user.email,
      userId: user.id,
      memberships: user.memberships.map((m) => ({
        hoaId: m.hoaId,
        role: m.role.name,
      })),
    };
  }
}
