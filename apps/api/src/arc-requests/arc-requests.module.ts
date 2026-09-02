import { Module } from '@nestjs/common';
import { ArcRequestsController } from './arc-requests.controller';
import { ArcRequestsService } from './arc-requests.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [ArcRequestsController],
  providers: [ArcRequestsService],
})
export class ArcRequestsModule {}
