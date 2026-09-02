import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { AcsEmailSender } from './acs-email-sender';
import { EMAIL_SENDER } from './email-sender.interface';

@Module({
  providers: [
    EmailService,
    AcsEmailSender,
    { provide: EMAIL_SENDER, useExisting: AcsEmailSender },
  ],
  exports: [EmailService],
})
export class EmailModule {}
