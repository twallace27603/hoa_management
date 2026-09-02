import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailClient } from '@azure/communication-email';
import type { EmailSender, OutgoingEmail } from './email-sender.interface';

@Injectable()
export class AcsEmailSender implements EmailSender {
  private readonly client: EmailClient;
  private readonly senderAddress: string;

  constructor(config: ConfigService) {
    this.client = new EmailClient(
      config.getOrThrow<string>('ACS_CONNECTION_STRING'),
    );
    this.senderAddress = config.getOrThrow<string>('ACS_SENDER_ADDRESS');
  }

  async send(message: OutgoingEmail): Promise<void> {
    const poller = await this.client.beginSend({
      senderAddress: this.senderAddress,
      content: { subject: message.subject, plainText: message.body },
      recipients: { to: message.to.map((address) => ({ address })) },
    });
    await poller.pollUntilDone();
  }
}
