import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { HealthController } from './health/health.controller';
import { MembershipsModule } from './memberships/memberships.module';
import { DocumentsModule } from './documents/documents.module';
import { ArcRequestsModule } from './arc-requests/arc-requests.module';
import { ViolationsModule } from './violations/violations.module';
import { CmsModule } from './cms/cms.module';
import { EmailModule } from './email/email.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    StorageModule,
    EmailModule,
    AuthModule,
    MembershipsModule,
    DocumentsModule,
    ArcRequestsModule,
    ViolationsModule,
    CmsModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
